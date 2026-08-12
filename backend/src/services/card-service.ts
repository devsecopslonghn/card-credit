import { CreditCardModel } from "../models/credit-card.js";
import { idOf, plain } from "../statement-domain.js";
import type { ServiceContext } from "./types/service-context.js";

export class CardService {
  static async compare(ctx: ServiceContext) {
    const cards = await CreditCardModel.find({ workspaceId: ctx.workspaceId, active: { $ne: false } }).sort({ createdAt: -1 }).lean();
    return cards.map((card) => {
      const value = plain(card);
      return {
        id: idOf(value._id),
        providerName: value.providerName ?? value.bank ?? "",
        displayName: value.displayName ?? value.name ?? "",
        network: value.network ?? value.type ?? "",
        owner: value.owner ?? "Tôi",
        annualFee: value.annualFee ?? null,
        cashbackCapAmount: value.cashbackCapAmount ?? null,
        annualFeeWaiverTarget: value.annualFeeWaiverTarget ?? null,
        statementDay: value.statementDay ?? null,
        paymentDueDays: value.paymentDueDays ?? null,
      };
    });
  }
}
