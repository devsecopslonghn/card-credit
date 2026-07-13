import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadDashboardResources } from "../lib/cards/dashboardLoadCore.mjs";

test("dashboard loader returns both successful resources", async () => {
  const result = await loadDashboardResources({
    loadCards: async () => [{ _id: "card-a" }],
    loadStatements: async () => [{ _id: "statement-a" }],
  });

  assert.deepEqual(result, {
    cards: [{ _id: "card-a" }],
    statements: [{ _id: "statement-a" }],
    cardsError: "",
    statementsError: "",
  });
});

test("dashboard loader keeps cards when statements fail and clears stale statements", async () => {
  const result = await loadDashboardResources({
    loadCards: async () => [{ _id: "card-a" }],
    loadStatements: async () => { throw new Error("Statement service unavailable"); },
  });

  assert.deepEqual(result.cards, [{ _id: "card-a" }]);
  assert.deepEqual(result.statements, []);
  assert.equal(result.cardsError, "");
  assert.equal(result.statementsError, "Statement service unavailable");
});

test("dashboard loader keeps statements result isolated when cards fail", async () => {
  const result = await loadDashboardResources({
    loadCards: async () => { throw new Error("Card service unavailable"); },
    loadStatements: async () => [{ _id: "statement-a" }],
  });

  assert.deepEqual(result.cards, []);
  assert.deepEqual(result.statements, [{ _id: "statement-a" }]);
  assert.equal(result.cardsError, "Card service unavailable");
  assert.equal(result.statementsError, "");
});

test("dashboard loader reports both failures with stable fallbacks", async () => {
  const result = await loadDashboardResources({
    loadCards: async () => { throw "cards failed"; },
    loadStatements: async () => { throw null; },
  });

  assert.deepEqual(result, {
    cards: [],
    statements: [],
    cardsError: "Không thể tải danh sách thẻ.",
    statementsError: "Không thể tải kỳ sao kê.",
  });
});

test("dashboard proxy registers the batch statement endpoint", () => {
  const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");

  assert.match(
    config,
    /source: "\/api\/card-statements", destination: `\$\{backend\}\/api\/card-statements`/,
  );
});

test("statement load failure marks card amounts unavailable and retains retry", () => {
  const page = readFileSync(new URL("../app/cards/page.tsx", import.meta.url), "utf8");
  const card = readFileSync(new URL("../components/cards/CardItem.tsx", import.meta.url), "utf8");

  assert.match(page, /statementsAvailable=\{!statementsError\}/);
  assert.match(page, /onRetry=\{loadCards\}/);
  assert.match(card, /statementsAvailable \? formatVnd\(summary\.currentOutstandingBalance\) : "--"/);
  assert.match(card, /statementsAvailable \? formatVnd\(summary\.statementAmountDue\) : "--"/);
});
