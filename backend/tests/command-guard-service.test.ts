import assert from "node:assert/strict";
import test from "node:test";
import { CommandAuditModel } from "../src/models/command-audit.js";
import { CommandReceiptModel, type CommandReceiptDocument } from "../src/models/command-receipt.js";
import { CommandGuardService, CommandReceiptReservationConflict, type CommandGuardRepository } from "../src/services/command-guard-service.js";
import { canonicalPayloadHash } from "../src/command-hash.js";
import type { ServiceContext } from "../src/services/types/service-context.js";

type Receipt = CommandReceiptDocument & { _id: string };

class FakeRepository implements CommandGuardRepository {
  receipts = new Map<string, Receipt>();
  audits: Array<Record<string, unknown>> = [];
  nextId = 1;
  completeResult = true;
  async startSession() { return {
    withTransaction: async (callback: () => Promise<void>) => {
      const receipts = new Map(this.receipts);
      const audits = [...this.audits];
      try { await callback(); } catch (error) { this.receipts = receipts; this.audits = audits; throw error; }
    },
    endSession: async () => undefined,
  } as never; }
  async findReceipt(filter: Record<string, unknown>) {
    return [...this.receipts.values()].find((value) => value.workspaceId === filter.workspaceId && value.operation === filter.operation && value.idempotencyKey === filter.idempotencyKey) ?? null;
  }
  async insertReceipt(record: Record<string, unknown>) {
    const key = `${record.workspaceId}:${record.operation}:${record.idempotencyKey}`;
    if ([...this.receipts.values()].some((value) => `${value.workspaceId}:${value.operation}:${value.idempotencyKey}` === key)) throw new CommandReceiptReservationConflict();
    const created = { ...record, _id: `receipt-${this.nextId++}` } as Receipt;
    this.receipts.set(created._id, created);
    return created;
  }
  async completeReceipt(filter: Record<string, unknown>, result: unknown) {
    const receipt = this.receipts.get(String(filter._id));
    if (!receipt) return false;
    receipt.status = "COMPLETED";
    receipt.result = result;
    return this.completeResult;
  }
  async insertAudit(record: Record<string, unknown>) { this.audits.push(record); }
}

const context: ServiceContext = { workspaceId: "workspace-a", userId: "user-a", role: "user", channel: "mcp", correlationId: "corr-a" };
const spec = { operation: "create_account", idempotencyKey: "command-key-1", payloadHash: canonicalPayloadHash({ name: "Cash" }), endpointOrTool: "confirm_create_account", resource: { type: "account", id: "account-1" } };

test("command guard completes once, audits success and replays without running work", async () => {
  const repository = new FakeRepository();
  const guard = new CommandGuardService(repository);
  let calls = 0;
  const first = await guard.execute(context, spec, async () => { calls += 1; return { id: "account-1" }; });
  const replay = await guard.execute(context, spec, async () => { calls += 1; return { id: "unexpected" }; });
  assert.deepEqual(first, { id: "account-1" });
  assert.deepEqual(replay, first);
  assert.equal(calls, 1);
  assert.equal(repository.receipts.size, 1);
  assert.equal(repository.audits.length, 1);
  assert.equal(repository.audits[0]?.outcome, "SUCCESS");
  assert.equal("payload" in (repository.audits[0] ?? {}), false);
});

test("command guard rejects payload mismatch and pending receipt", async () => {
  const repository = new FakeRepository();
  const guard = new CommandGuardService(repository);
  await guard.execute(context, spec, async () => "done");
  await assert.rejects(() => guard.execute(context, { ...spec, payloadHash: canonicalPayloadHash({ name: "Other" }) }, async () => "bad"), (error: unknown) => error instanceof Error && "code" in error && error.code === "IDEMPOTENCY_PAYLOAD_MISMATCH");
  repository.receipts.clear();
  repository.receipts.set("pending", { ...spec, _id: "pending", workspaceId: context.workspaceId, userId: context.userId, channel: context.channel, status: "PENDING" });
  await assert.rejects(() => guard.execute(context, spec, async () => "bad"), (error: unknown) => error instanceof Error && "code" in error && error.code === "COMMAND_IN_PROGRESS");
});

test("concurrent command guard calls run business work once and rollback failed work", async () => {
  const repository = new FakeRepository();
  const guard = new CommandGuardService(repository);
  let calls = 0;
  const first = guard.execute(context, spec, async () => { calls += 1; await new Promise((resolve) => setTimeout(resolve, 15)); return "done"; });
  await new Promise((resolve) => setTimeout(resolve, 1));
  const second = guard.execute(context, spec, async () => { calls += 1; return "bad"; });
  await assert.rejects(second, (error: unknown) => error instanceof Error && "code" in error && error.code === "COMMAND_IN_PROGRESS");
  assert.equal(await first, "done");
  assert.equal(calls, 1);

  const failing = new FakeRepository();
  const failingGuard = new CommandGuardService(failing);
  await assert.rejects(() => failingGuard.execute(context, spec, async () => { throw new Error("business failed"); }));
  assert.equal(failing.receipts.size, 0);
  assert.equal(failing.audits.length, 0);
});

test("command guard accepts only safe resource metadata and declares additive indexes", async () => {
  await assert.rejects(() => new CommandGuardService(new FakeRepository()).execute(context, { ...spec, resource: { payload: "secret" } }, async () => "bad"), (error: unknown) => error instanceof Error && "code" in error && error.code === "INVALID_COMMAND_RESOURCE");
  const receiptIndexes = CommandReceiptModel.schema.indexes() as Array<[Record<string, unknown>, { name?: string; [key: string]: unknown }]>;
  const auditIndexes = CommandAuditModel.schema.indexes() as Array<[Record<string, unknown>, { name?: string; [key: string]: unknown }]>;
  assert.equal(receiptIndexes.some(([, options]) => options.name === "command_receipt_unique"), true);
  assert.equal(auditIndexes.some(([, options]) => options.name === "command_audit_workspace_created"), true);
});

test("command guard does not retry duplicate errors raised by business work", async () => {
  const repository = new FakeRepository();
  const guard = new CommandGuardService(repository);
  let calls = 0;
  const duplicate = Object.assign(new Error("business duplicate"), { code: 11000 });
  await assert.rejects(() => guard.execute(context, spec, async () => {
    calls += 1;
    throw duplicate;
  }), (error: unknown) => error === duplicate);
  assert.equal(calls, 1);
  assert.equal(repository.receipts.size, 0);
});

test("command guard aborts when receipt completion does not match", async () => {
  const repository = new FakeRepository();
  repository.completeResult = false;
  const guard = new CommandGuardService(repository);
  await assert.rejects(() => guard.execute(context, spec, async () => "done"), (error: unknown) => error instanceof Error && "code" in error && error.code === "COMMAND_RECEIPT_COMPLETION_FAILED");
  assert.equal(repository.receipts.size, 0);
  assert.equal(repository.audits.length, 0);
});
