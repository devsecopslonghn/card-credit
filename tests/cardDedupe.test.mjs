import assert from "node:assert/strict";
import { test } from "node:test";
import {
  duplicateFingerprintForCard,
  findDuplicateCardGroups,
  mergeMonthlyDataBySum,
} from "../lib/cards/dedupeCore.mjs";
import { createCardDuplicateRouteHandlers } from "../lib/api/cardsRouteCore.mjs";
import { findDuplicateCards, mergeDuplicateCards } from "../lib/services/cardService.mjs";

const objectId = (suffix) => `64b0000000000000000000${suffix}`;

const clone = (value) => JSON.parse(JSON.stringify(value));

const readJson = async (response) => ({
  status: response.status,
  body: await response.json(),
});

const card = (overrides = {}) => ({
  _id: objectId("01"),
  workspaceId: "workspace-a",
  presetId: "sacombank-visa-platinum-cashback",
  providerCode: "STB",
  providerName: "Sacombank",
  displayName: "Visa Platinum Cashback",
  network: "Visa",
  bank: "STB",
  name: "Visa Platinum Cashback",
  type: "Visa",
  owner: "Long Ho",
  imageUrl: "/card-images/placeholder-card.svg",
  annualFee: 299000,
  monthlyData: [{ month: 1, spend: 100, cashback: 1, fee: 0, otherInterest: 0 }],
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const createCardModel = (initialCards) => {
  const state = {
    cards: initialCards.map(clone),
  };

  const matches = (item, query = {}) => Object.entries(query).every(([key, value]) => item[key] === value);

  return {
    state,
    find(query = {}) {
      const results = state.cards.filter((item) => matches(item, query));
      return {
        sort(sortSpec = {}) {
          const [field, direction] = Object.entries(sortSpec)[0] ?? ["createdAt", 1];
          return clone(
            results.sort((left, right) => {
              const comparison = String(left[field] ?? "").localeCompare(String(right[field] ?? ""));
              return direction < 0 ? -comparison : comparison;
            }),
          );
        },
      };
    },
    async findById(id) {
      const found = state.cards.find((item) => item._id === id);
      return found ? clone(found) : null;
    },
    async findByIdAndUpdate(id, update) {
      const index = state.cards.findIndex((item) => item._id === id);
      if (index === -1) return null;
      state.cards[index] = { ...state.cards[index], ...clone(update) };
      return clone(state.cards[index]);
    },
    async findByIdAndDelete(id) {
      const index = state.cards.findIndex((item) => item._id === id);
      if (index === -1) return null;
      const [deleted] = state.cards.splice(index, 1);
      return clone(deleted);
    },
  };
};

test("duplicate fingerprint uses workspace, preset and normalized owner", () => {
  const fingerprint = duplicateFingerprintForCard(card({ owner: " Long   Ho " }));

  assert.equal(fingerprint.key, "workspace-a::sacombank-visa-platinum-cashback::Long Ho");
  assert.equal(duplicateFingerprintForCard(card({ presetId: null })), null);
  assert.equal(duplicateFingerprintForCard(card({ workspaceId: null })), null);
});

test("findDuplicateCardGroups detects exact duplicates without crossing workspace", () => {
  const groups = findDuplicateCardGroups([
    card({ _id: objectId("01"), owner: "Long Ho" }),
    card({ _id: objectId("02"), owner: " Long   Ho ", createdAt: "2026-01-02T00:00:00.000Z" }),
    card({ _id: objectId("03"), workspaceId: "workspace-b", owner: "Long Ho" }),
    card({ _id: objectId("04"), owner: "Other Owner" }),
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].cards.length, 2);
  assert.deepEqual(groups[0].cards.map((item) => item._id), [objectId("01"), objectId("02")]);
});

test("mergeMonthlyDataBySum preserves target months and adds source amounts", () => {
  const merged = mergeMonthlyDataBySum(
    [{ month: 1, spend: 100, cashback: 2, fee: 3, otherInterest: 4 }],
    [
      { month: 1, spend: 50, cashback: 1, fee: 2, otherInterest: 3 },
      { month: 2, spend: 25, cashback: 0, fee: 0, otherInterest: 0 },
    ],
  );

  assert.deepEqual(merged, [
    { month: 1, spend: 150, cashback: 3, fee: 5, otherInterest: 7 },
    { month: 2, spend: 25, cashback: 0, fee: 0, otherInterest: 0 },
  ]);
});

test("findDuplicateCards scopes dry-run by session workspace", async () => {
  const CardModel = createCardModel([
    card({ _id: objectId("01"), workspaceId: "workspace-a" }),
    card({ _id: objectId("02"), workspaceId: "workspace-a", owner: " Long   Ho " }),
    card({ _id: objectId("03"), workspaceId: "workspace-b" }),
  ]);

  const groups = await findDuplicateCards({
    CardModel,
    session: { workspaceId: "workspace-a" },
  });

  assert.equal(groups.length, 1);
  assert.equal(groups[0].cards.length, 2);
});

test("mergeDuplicateCards sums monthly data and deletes only exact duplicate source", async () => {
  const sourceCardId = objectId("02");
  const targetCardId = objectId("01");
  const CardModel = createCardModel([
    card({ _id: targetCardId, workspaceId: "workspace-a" }),
    card({
      _id: sourceCardId,
      workspaceId: "workspace-a",
      owner: " Long   Ho ",
      monthlyData: [{ month: 1, spend: 50, cashback: 2, fee: 1, otherInterest: 0 }],
    }),
  ]);

  const result = await mergeDuplicateCards(
    { sourceCardId, targetCardId },
    { CardModel, session: { workspaceId: "workspace-a" } },
  );

  assert.equal(result.deletedSourceId, sourceCardId);
  assert.equal(CardModel.state.cards.length, 1);
  assert.deepEqual(CardModel.state.cards[0].monthlyData, [
    { month: 1, spend: 150, cashback: 3, fee: 1, otherInterest: 0 },
  ]);
});

test("mergeDuplicateCards rejects cards from different duplicate fingerprints", async () => {
  const CardModel = createCardModel([
    card({ _id: objectId("01"), workspaceId: "workspace-a" }),
    card({ _id: objectId("02"), workspaceId: "workspace-a", owner: "Other Owner" }),
  ]);

  await assert.rejects(
    () =>
      mergeDuplicateCards(
        { sourceCardId: objectId("02"), targetCardId: objectId("01") },
        { CardModel, session: { workspaceId: "workspace-a" } },
      ),
    /Hai thẻ không phải duplicate exact-match/,
  );
  assert.equal(CardModel.state.cards.length, 2);
});

test("duplicate API exposes dry-run groups and merge operation", async () => {
  const sourceCardId = objectId("02");
  const targetCardId = objectId("01");
  const CardModel = createCardModel([
    card({ _id: targetCardId, workspaceId: "workspace-a" }),
    card({ _id: sourceCardId, workspaceId: "workspace-a", owner: " Long   Ho " }),
  ]);
  const handlers = createCardDuplicateRouteHandlers({
    connectToDatabase: async () => {},
    CardModel,
    requireAuth: () => ({ workspaceId: "workspace-a", userId: "user-a", role: "user" }),
  });

  const dryRun = await readJson(await handlers.GET(new Request("https://test.local/api/cards/duplicates")));
  assert.equal(dryRun.status, 200);
  assert.equal(dryRun.body.data.length, 1);
  assert.equal(dryRun.body.data[0].cards.length, 2);

  const merge = await readJson(
    await handlers.POST(
      new Request("https://test.local/api/cards/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceCardId, targetCardId }),
      }),
    ),
  );
  assert.equal(merge.status, 200);
  assert.equal(merge.body.data.deletedSourceId, sourceCardId);
  assert.equal(CardModel.state.cards.length, 1);
});
