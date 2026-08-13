import mongoose from "mongoose";
import type { AuthRepository } from "./auth-repository.js";
import type { MailService } from "./mail-service.js";
import { CreditCardModel } from "./models/credit-card.js";
import { CardStatementModel } from "./models/card-statement.js";
import { FinancialTransactionModel } from "./models/financial-transaction.js";
import { ReminderDeliveryModel } from "./models/reminder-delivery.js";
import { WorkspaceModel } from "./models/workspace.js";
import { composePaymentReminder, reminderDueDate, reminderIsDue, retryAt } from "./payment-reminder.js";

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export class ReminderScheduler {
  private timer?: NodeJS.Timeout; private running = false;
  constructor(private users: AuthRepository, private mail: MailService & { sendPaymentReminder: NonNullable<MailService["sendPaymentReminder"]> }, private intervalMs: number, private claimTimeoutMs: number, private log: { error(v: unknown): void; info(v: unknown): void }, private now = () => new Date()) {}
  start() { if (this.timer || this.intervalMs <= 0) return; this.timer = setInterval(() => void this.safeScan(), this.intervalMs).unref(); void this.safeScan(); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = undefined; }
  async safeScan() { if (this.running) return; this.running = true; try { await this.scan(); } catch { this.log.error({ event: "REMINDER_SCAN_FAILED" }); } finally { this.running = false; } }
  async scan() {
    const now = this.now();
    const cards = (await CreditCardModel.find({ reminderEnabled: true, active: { $ne: false } })).map((card) => card.toObject() as Record<string, unknown>);
    if (!cards.length) return;
    const cardById = new Map(cards.map((card) => [String(card._id), card]));
    const workspaceIds = [...new Set(cards.map((card) => String(card.workspaceId ?? "")).filter(Boolean))];
    const dueDates = [...new Set(cards.flatMap((card) => (card.reminderDaysBefore as number[] ?? [7, 3, 1]).map((days) => reminderDueDate(now, days, String(card.reminderTimezone ?? "Asia/Ho_Chi_Minh")))))];
    const statements = await CardStatementModel.find({
      workspaceId: { $in: workspaceIds },
      userCardId: { $in: [...cardById.keys()] },
      paymentStatus: { $ne: "PAID" },
      paymentDueDate: { $in: dueDates },
    });
    const candidates = statements.flatMap((rawStatement) => {
      const statement = rawStatement.toObject() as Record<string, unknown>;
      const card = cardById.get(String(statement.userCardId));
      if (!card || String(card.workspaceId ?? "") !== String(statement.workspaceId ?? "")) return [];
      return (card.reminderDaysBefore as number[] ?? [7, 3, 1])
        .filter((days) => reminderIsDue(now, String(statement.paymentDueDate), days, String(card.reminderTimezone ?? "Asia/Ho_Chi_Minh"), String(card.reminderTime ?? "08:00")))
        .map((days) => ({ card, statement, days, workspaceId: String(card.workspaceId), cardId: String(card._id) }));
    });
    if (!candidates.length) return;
    const fallbackWorkspaceIds = [...new Set(candidates.filter(({ card }) => typeof card.userId !== "string" || !card.userId).map(({ workspaceId }) => workspaceId))];
    const workspaces = fallbackWorkspaceIds.length ? await WorkspaceModel.find({ workspaceId: { $in: fallbackWorkspaceIds } }) : [];
    const workspaceOwnerById = new Map(workspaces.map((workspace) => [String(workspace.get("workspaceId")), String(workspace.get("ownerUserId") ?? "")]));
    const statementIds = [...new Set(candidates.map(({ statement }) => statement._id))];
    const totals = await FinancialTransactionModel.aggregate([
      { $match: { workspaceId: { $in: workspaceIds }, statementId: { $in: statementIds }, transactionType: { $ne: "STATEMENT_PAYMENT" } } },
      { $group: { _id: "$statementId", amount: { $sum: "$amount" } } },
    ]);
    const amountByStatement = new Map(totals.map((total) => [String(total._id), Number(total.amount ?? 0)]));
    const userById = new Map<string, ReturnType<AuthRepository["findUserById"]>>();
    for (const candidate of candidates) {
      const ownerId = typeof candidate.card.userId === "string" && candidate.card.userId
        ? candidate.card.userId
        : workspaceOwnerById.get(candidate.workspaceId) ?? "";
      if (ownerId && mongoose.isValidObjectId(ownerId) && !userById.has(ownerId)) userById.set(ownerId, this.users.findUserById(ownerId));
      await this.deliver({ ...candidate, user: ownerId ? await userById.get(ownerId) ?? null : null, amount: amountByStatement.get(String(candidate.statement._id)) ?? 0, now });
    }
  }
  private async deliver(x: { now: Date; workspaceId: string; cardId: string; card: Record<string, unknown>; statement: Record<string, unknown>; days: number; user: Awaited<ReturnType<AuthRepository["findUserById"]>>; amount: number }) {
    let delivery; const expiredBefore = new Date(x.now.getTime() - this.claimTimeoutMs);
    const claimable = { workspaceId: x.workspaceId, statementId: x.statement._id, daysBefore: x.days, $and: [{ $or: [{ attemptCount: { $exists: false } }, { attemptCount: { $lt: 3 } }] }, { $or: [{ status: { $in: ["PENDING", "FAILED"] }, nextAttemptAt: null }, { status: "FAILED", nextAttemptAt: { $lte: x.now } }, { status: "CLAIMED", claimedAt: { $lte: expiredBefore } }, { status: { $exists: false } }] }] };
    try { delivery = await ReminderDeliveryModel.findOneAndUpdate(claimable, { $setOnInsert: { cardId: x.card._id }, $set: { status: "CLAIMED", claimedAt: x.now, nextAttemptAt: null, failureCode: null }, $inc: { attemptCount: 1 } }, { upsert: true, returnDocument: "after" }); } catch (e) { if ((e as { code?: number }).code === 11000) return; throw e; }
    if (!delivery) return; const attempts = Number(delivery.get("attemptCount"));
    if (!x.user || x.user.workspaceId !== x.workspaceId || !x.user.active || x.user.lockedAt || !emailOk(x.user.email)) { await ReminderDeliveryModel.updateOne({ _id: delivery._id }, { $set: { status: "SKIPPED", failureCode: "RECIPIENT_UNAVAILABLE" } }); return; }
    try { await this.mail.sendPaymentReminder(composePaymentReminder({ to: x.user.email.toLowerCase(), cardName: String(x.card.displayName ?? x.card.name ?? "Thẻ tín dụng"), statementDate: String(x.statement.statementDate), dueDate: String(x.statement.paymentDueDate), amount: x.amount, daysBefore: x.days })); await ReminderDeliveryModel.updateOne({ _id: delivery._id }, { $set: { status: "SENT", sentAt: x.now, failureCode: null } }); this.log.info({ event: "PAYMENT_REMINDER_SENT", deliveryId: String(delivery._id) }); }
    catch { await ReminderDeliveryModel.updateOne({ _id: delivery._id }, { $set: attempts >= 3 ? { status: "FAILED", failureCode: "SMTP_SUBMISSION_FAILED", nextAttemptAt: null } : { status: "FAILED", failureCode: "SMTP_SUBMISSION_FAILED", nextAttemptAt: retryAt(x.now, attempts) } }); }
  }
}
