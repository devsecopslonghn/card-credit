import type { ServiceContext } from "./types/service-context.js";
import { CardQueryService } from "./card-query-service.js";

export class CardService {
  static async compare(ctx: ServiceContext) {
    return CardQueryService.compare(ctx);
  }
}
