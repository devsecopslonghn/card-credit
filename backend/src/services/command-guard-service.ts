import mongoose from "mongoose";
import { ApiError } from "../errors.js";
import { CommandAuditModel, type CommandAuditDocument } from "../models/command-audit.js";
import { CommandReceiptModel, type CommandReceiptDocument } from "../models/command-receipt.js";
import type { ServiceContext } from "./types/service-context.js";

export type CommandGuardSpec = {
  operation: string;
  idempotencyKey: string;
  payloadHash: string;
  endpointOrTool: string;
  previewId?: string;
  resource?: Record<string, unknown>;
};

export type CommandInvocation = {
  idempotencyKey: string;
  endpointOrTool: string;
  previewId?: string;
};

export type CommandGuardRepository = {
  startSession: () => Promise<mongoose.ClientSession>;
  findReceipt: (filter: Record<string, unknown>, session: mongoose.ClientSession) => Promise<CommandReceiptDocument | null>;
  insertReceipt: (record: CommandReceiptDocument, session: mongoose.ClientSession) => Promise<CommandReceiptDocument>;
  completeReceipt: (filter: Record<string, unknown>, result: unknown, session: mongoose.ClientSession) => Promise<boolean>;
  insertAudit: (record: CommandAuditDocument, session: mongoose.ClientSession) => Promise<void>;
};

export class CommandReceiptReservationConflict extends Error {
  readonly code = "COMMAND_RECEIPT_RESERVATION_CONFLICT";

  constructor() {
    super("Command receipt reservation conflicted");
    this.name = "CommandReceiptReservationConflict";
  }
}

const mongoRepository: CommandGuardRepository = {
  startSession: () => mongoose.startSession(),
  async findReceipt(filter, session) {
    return await CommandReceiptModel.findOne(filter as never).session(session).lean() as CommandReceiptDocument | null;
  },
  async insertReceipt(record, session) {
    try {
      const createdItems = await CommandReceiptModel.create([record], { session }) as unknown as Array<{ toObject: () => unknown }>;
      const [created] = createdItems;
      if (!created) throw new Error("Command receipt was not created");
      return created.toObject() as CommandReceiptDocument;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === 11000) throw new CommandReceiptReservationConflict();
      throw error;
    }
  },
  async completeReceipt(filter, result, session) {
    const update = await CommandReceiptModel.updateOne(filter, { $set: { status: "COMPLETED", result, completedAt: new Date() } }, { session });
    const writeResult = update as unknown as { matchedCount?: number; n?: number };
    return Number(writeResult.matchedCount ?? writeResult.n ?? 0) === 1;
  },
  async insertAudit(record, session) {
    await CommandAuditModel.create([record], { session });
  },
};

const validResourceKeys = new Set(["type", "id", "resourceType", "resourceId", "cardId", "statementId", "accountId"]);
const safeResource = (resource: Record<string, unknown> | undefined) => {
  if (!resource) return null;
  const entries = Object.entries(resource);
  if (entries.some(([key, value]) => !validResourceKeys.has(key) || (typeof value !== "string" && !(typeof value === "number" && Number.isFinite(value))))) {
    throw new ApiError(400, "INVALID_COMMAND_RESOURCE", "Resource audit không hợp lệ.");
  }
  return Object.fromEntries(entries);
};

const validateSpec = (spec: CommandGuardSpec) => {
  const operation = spec.operation.trim();
  const endpointOrTool = spec.endpointOrTool.trim();
  const idempotencyKey = spec.idempotencyKey.trim();
  if (!operation || operation.length > 160 || !endpointOrTool || endpointOrTool.length > 240) throw new ApiError(400, "INVALID_COMMAND_GUARD", "Command guard metadata không hợp lệ.");
  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) throw new ApiError(400, "INVALID_IDEMPOTENCY_KEY", "Idempotency key không hợp lệ.");
  if (!/^[a-f0-9]{64}$/i.test(spec.payloadHash)) throw new ApiError(400, "INVALID_COMMAND_HASH", "Payload hash không hợp lệ.");
  return { operation, endpointOrTool, idempotencyKey, payloadHash: spec.payloadHash.toLowerCase(), previewId: spec.previewId?.trim() || null, resource: safeResource(spec.resource) };
};

export class CommandGuardService {
  constructor(private readonly repository: CommandGuardRepository = mongoRepository) {}

  async execute<T>(ctx: ServiceContext, spec: CommandGuardSpec, work: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
    const metadata = validateSpec(spec);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.executeOnce(ctx, metadata, work);
      } catch (error) {
        if (attempt === 0 && error instanceof CommandReceiptReservationConflict) continue;
        throw error;
      }
    }
    throw new ApiError(409, "COMMAND_IN_PROGRESS", "Command đang được xử lý.");
  }

  private async executeOnce<T>(ctx: ServiceContext, metadata: ReturnType<typeof validateSpec>, work: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
    const session = await this.repository.startSession();
    let output!: T;
    try {
      await session.withTransaction(async () => {
        const filter = { workspaceId: ctx.workspaceId, operation: metadata.operation, idempotencyKey: metadata.idempotencyKey };
        const existing = await this.repository.findReceipt(filter, session);
        if (existing) {
          if (existing.payloadHash !== metadata.payloadHash) throw new ApiError(409, "IDEMPOTENCY_PAYLOAD_MISMATCH", "Idempotency key đã dùng cho payload khác.");
          if (existing.status === "COMPLETED") {
            output = existing.result as T;
            return;
          }
          if (existing.status === "PENDING") throw new ApiError(409, "COMMAND_IN_PROGRESS", "Command đang được xử lý.");
          throw new ApiError(409, "COMMAND_FAILED", existing.errorCode || "Command trước đó đã thất bại.");
        }
        const pending = await this.repository.insertReceipt({
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          channel: ctx.channel,
          operation: metadata.operation,
          idempotencyKey: metadata.idempotencyKey,
          payloadHash: metadata.payloadHash,
          status: "PENDING",
          result: null,
          errorCode: null,
          completedAt: null,
        }, session);
        output = await work(session);
        const completed = await this.repository.completeReceipt({ _id: pending._id }, output, session);
        if (!completed) throw new ApiError(500, "COMMAND_RECEIPT_COMPLETION_FAILED", "Không thể hoàn tất command receipt.");
        await this.repository.insertAudit({
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          channel: ctx.channel,
          correlationId: ctx.correlationId,
          operation: metadata.operation,
          endpointOrTool: metadata.endpointOrTool,
          previewId: metadata.previewId,
          resource: metadata.resource,
          outcome: "SUCCESS",
          errorCode: null,
        }, session);
      });
      return output;
    } finally {
      await session.endSession();
    }
  }
}

export const commandGuardService = new CommandGuardService();
