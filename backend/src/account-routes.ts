import type { FastifyInstance } from "fastify";
import { sessionFromRequest } from "./auth.js";
import { AccountService } from "./services/account-service.js";
import { createAccountInputSchema } from "@card-credit/contracts";
import type { CreateAccountInput } from "@card-credit/contracts";

export const registerAccountRoutes = (app: FastifyInstance, secret: string) => {
  app.get("/api/accounts", async (request) => {
    return { data: await AccountService.list(sessionFromRequest(request, secret)) };
  });

  app.post("/api/accounts", async (request, reply) => {
    const parsed = createAccountInputSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: "INVALID_ACCOUNT", message: "Dữ liệu tài khoản không hợp lệ." } });
    }
    return reply.status(201).send({
      data: await AccountService.create(sessionFromRequest(request, secret), parsed.data as CreateAccountInput),
    });
  });
};
