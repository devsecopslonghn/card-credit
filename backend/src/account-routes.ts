import type { FastifyInstance } from "fastify";
import { sessionFromRequest } from "./auth.js";
import { AccountService } from "./services/account-service.js";
import type { AccountType } from "./financial-domain.js";

type Body = {
  name?: unknown;
  type?: unknown;
  creditCardId?: unknown;
  openingBalance?: unknown;
};

const accountTypes = new Set<AccountType>(["DEBIT", "CASH", "CREDIT"]);

export const registerAccountRoutes = (app: FastifyInstance, secret: string) => {
  app.get("/api/accounts", async (request) => {
    return { data: await AccountService.list(sessionFromRequest(request, secret)) };
  });

  app.post<{ Body: Body }>("/api/accounts", async (request, reply) => {
    const body = request.body ?? {};
    const name = typeof body.name === "string" ? body.name : "";
    const type = typeof body.type === "string" && accountTypes.has(body.type as AccountType)
      ? (body.type as AccountType)
      : null;
    const creditCardId = typeof body.creditCardId === "string" ? body.creditCardId : undefined;
    const openingBalance = body.openingBalance === undefined ? undefined : Number(body.openingBalance);
    if (!type) {
      return reply.status(400).send({ error: { code: "INVALID_ACCOUNT", message: "type phải là DEBIT, CASH hoặc CREDIT." } });
    }
    return reply.status(201).send({
      data: await AccountService.create(sessionFromRequest(request, secret), {
        name,
        type,
        creditCardId,
        openingBalance,
      }),
    });
  });
};
