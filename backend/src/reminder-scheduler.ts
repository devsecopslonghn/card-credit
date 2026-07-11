import mongoose from "mongoose";
import type { AuthRepository } from "./auth-repository.js";
import type { MailService } from "./mail-service.js";
import { CreditCardModel } from "./models/credit-card.js";
import { CardStatementModel } from "./models/card-statement.js";
import { CardTransactionModel } from "./models/card-transaction.js";
import { ReminderDeliveryModel } from "./models/reminder-delivery.js";
import { WorkspaceModel } from "./models/workspace.js";
import { composePaymentReminder, reminderIsDue, retryAt } from "./payment-reminder.js";

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export class ReminderScheduler {
  private timer?: NodeJS.Timeout; private running = false;
  constructor(private users: AuthRepository, private mail: MailService & { sendPaymentReminder: NonNullable<MailService["sendPaymentReminder"]> }, private intervalMs: number, private claimTimeoutMs: number, private log: { error(v: unknown): void; info(v: unknown): void }, private now = () => new Date()) {}
  start() { if (this.timer || this.intervalMs <= 0) return; this.timer = setInterval(() => void this.safeScan(), this.intervalMs).unref(); void this.safeScan(); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = undefined; }
  async safeScan() { if (this.running) return; this.running = true; try { await this.scan(); } catch { this.log.error({ event: "REMINDER_SCAN_FAILED" }); } finally { this.running = false; } }
  async scan() {
    const now = this.now(); const cards = await CreditCardModel.find({ reminderEnabled: true, active: { $ne: false } });
    for (const raw of cards) { const card = raw.toObject() as Record<string, unknown>; const workspaceId = String(card.workspaceId ?? ""); const cardId = String(card._id); const statements = await CardStatementModel.find({ workspaceId, userCardId: card._id, paymentStatus: { $ne: "PAID" } });
      for (const rawStatement of statements) { const statement = rawStatement.toObject() as Record<string, unknown>; for (const days of (card.reminderDaysBefore as number[] ?? [7,3,1])) {
        if (!reminderIsDue(now, String(statement.paymentDueDate), days, String(card.reminderTimezone ?? "Asia/Ho_Chi_Minh"), String(card.reminderTime ?? "08:00"))) continue;
        await this.deliver({ now, workspaceId, cardId, card, statement, days });
      }}
    }
  }
  private async deliver(x: { now: Date; workspaceId: string; cardId: string; card: Record<string, unknown>; statement: Record<string, unknown>; days: number }) {
    let delivery; const expiredBefore = new Date(x.now.getTime() - this.claimTimeoutMs);
    const claimable = { workspaceId: x.workspaceId, statementId: x.statement._id, daysBefore: x.days, $and: [{ $or: [{ attemptCount: { $exists: false } }, { attemptCount: { $lt: 3 } }] }, { $or: [{ status: { $in: ["PENDING", "FAILED"] }, nextAttemptAt: null }, { status: "FAILED", nextAttemptAt: { $lte: x.now } }, { status: "CLAIMED", claimedAt: { $lte: expiredBefore } }, { status: { $exists: false } }] }] };
    try { delivery = await ReminderDeliveryModel.findOneAndUpdate(claimable, { $setOnInsert: { cardId: x.card._id }, $set: { status: "CLAIMED", claimedAt: x.now, nextAttemptAt: null, failureCode: null }, $inc: { attemptCount: 1 } }, { upsert: true, returnDocument: "after" }); } catch (e) { if ((e as { code?: number }).code === 11000) return; throw e; }
    if (!delivery) return; const attempts = Number(delivery.get("attemptCount"));
    const ownerId = typeof x.card.userId === "string" && x.card.userId ? x.card.userId : String((await WorkspaceModel.findOne({ workspaceId: x.workspaceId }))?.get("ownerUserId") ?? "");
    const user = ownerId && mongoose.isValidObjectId(ownerId) ? await this.users.findUserById(ownerId) : null;
    if (!user || user.workspaceId !== x.workspaceId || !user.active || user.lockedAt || !emailOk(user.email)) { await ReminderDeliveryModel.updateOne({ _id: delivery._id }, { $set: { status: "SKIPPED", failureCode: "RECIPIENT_UNAVAILABLE" } }); return; }
    const totals = await CardTransactionModel.aggregate([{ $match: { statementId: x.statement._id } }, { $group: { _id: null, amount: { $sum: "$outcomeAmount" } } }]);
    try { await this.mail.sendPaymentReminder(composePaymentReminder({ to: user.email.toLowerCase(), cardName: String(x.card.displayName ?? x.card.name ?? "Thẻ tín dụng"), statementDate: String(x.statement.statementDate), dueDate: String(x.statement.paymentDueDate), amount: Number(totals[0]?.amount ?? 0), daysBefore: x.days })); await ReminderDeliveryModel.updateOne({ _id: delivery._id }, { $set: { status: "SENT", sentAt: x.now, failureCode: null } }); this.log.info({ event: "PAYMENT_REMINDER_SENT", deliveryId: String(delivery._id) }); }
    catch { await ReminderDeliveryModel.updateOne({ _id: delivery._id }, { $set: attempts >= 3 ? { status: "FAILED", failureCode: "SMTP_SUBMISSION_FAILED", nextAttemptAt: null } : { status: "FAILED", failureCode: "SMTP_SUBMISSION_FAILED", nextAttemptAt: retryAt(x.now, attempts) } }); }
  }
}
