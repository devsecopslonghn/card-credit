import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("statement client parses canonical DTOs and keeps payment compatibility isolated", () => {
  const client = readFileSync(new URL("../lib/api/statementsClient.ts", import.meta.url), "utf8");
  const cardsPage = readFileSync(new URL("../app/cards/page.tsx", import.meta.url), "utf8");
  const paymentsPage = readFileSync(new URL("../app/payments/page.tsx", import.meta.url), "utf8");
  assert.match(client, /statementListSchema\.parse/);
  assert.match(client, /statementSchema\.parse/);
  assert.match(client, /fetchAllCardStatements/);
  assert.match(client, /_id: value\.id/);
  assert.match(client, /outstandingAmount: value\.summary\.outstandingAmount/);
  assert.match(cardsPage, /summary\?\.outstandingAmount/);
  assert.match(paymentsPage, /summary\?\.outstandingAmount/);
  assert.match(client, /updateStatementPayment/);
  assert.match(client, /previewStatementPayment/);
  assert.match(client, /payment\/preview/);
  assert.match(client, /"Idempotency-Key": idempotencyKey/);
});
