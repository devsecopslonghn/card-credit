import type { FastifyInstance } from "fastify";
import { browserServiceContext } from "./context.js";
import { AccountService } from "./services/account-service.js";
import { createAccountInputSchema } from "@card-credit/contracts";
import type { CreateAccountInput } from "@card-credit/contracts";
import type { AuthRepository } from "./auth-repository.js";

export const registerAccountRoutes = (app: FastifyInstance, secret: string, users?: Pick<AuthRepository, "findUserById">) => {
  app.get("/api/accounts", async (request) => {
    return { data: await AccountService.list(await browserServiceContext(request, secret, users)) };
  });

  app.post("/api/accounts", async (request, reply) => {
    const parsed = createAccountInputSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: "INVALID_ACCOUNT", message: "Dữ liệu tài khoản không hợp lệ." } });
    }
    return reply.status(201).send({
      data: await AccountService.create(await browserServiceContext(request, secret, users), parsed.data as CreateAccountInput),
    });
  });
};
