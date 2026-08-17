import { expect, test } from "@playwright/test";

const json = (body: unknown, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(body) });
const metric = () => ({ personalSpending: 100_000, debitCashflow: -100_000, creditDebt: 100_000, outstandingReceivable: 0, reimbursementReceived: 0, transactionCount: 1 });
const report = {
  range: { from: "2026-08-01", to: "2026-08-31" },
  totals: { ...metric(), totalServiceFee: 0, transactionCashbackActual: 0, monthlyBankCashbackExpected: 0, monthlyBankCashbackActual: 0, monthlyBankCashbackRejected: 0, totalPaidCardFees: 0, actualNetBenefit: 0 },
  netAssets: 0, creditDebtBalance: 100_000, debit: metric(), cash: metric(), eWallet: metric(), realMoney: metric(), credit: metric(),
  byCategory: { FOOD: metric() }, byAccount: {},
};

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "card_credit_session", value: "e2e-session-placeholder", url: "http://127.0.0.1:3000", httpOnly: true, sameSite: "Lax" }]);
});

test("reports renders canonical filtered data at runtime", async ({ page }) => {
  let lastSummaryUrl = "";
  await page.route("**/api/cards*", (route) => route.fulfill(json({ data: [{ _id: "card-1", providerName: "Bank", displayName: "Visa", owner: "Alice", active: true }] })));
  await page.route("**/api/financial-reports/summary*", (route) => { lastSummaryUrl = route.request().url(); return route.fulfill(json({ data: report })); });
  await page.goto("/reports");
  await expect(page.getByText("Personal spending")).toBeVisible();
  await page.getByLabel("Năm báo cáo").fill("2026");
  await expect.poll(() => lastSummaryUrl).toContain("year=2026");
  await expect(page.getByText("FOOD")).toBeVisible();
});

test("budgets and recurring use category catalogue and lifecycle writes", async ({ page }) => {
  let recurring: Array<Record<string, unknown>> = [];
  let budgetBody: Record<string, unknown> | null = null;
  await page.route("**/api/finance/categories", (route) => route.fulfill(json({ data: [{ id: "food", name: "FOOD", parentId: null, system: true }] })));
  await page.route("**/api/finance/budgets/status*", (route) => route.fulfill(json({ data: [] })));
  await page.route("**/api/finance/budgets", async (route) => { budgetBody = JSON.parse(route.request().postData() ?? "{}"); return route.fulfill(json({ data: { id: "budget-1" } })); });
  await page.goto("/budgets");
  await page.getByLabel("Category ID").fill("FOOD");
  await page.getByLabel("Hạn mức").fill("500000");
  await page.getByRole("button", { name: "Lưu ngân sách" }).click();
  await expect.poll(() => budgetBody).toMatchObject({ categoryId: "FOOD", limitAmount: 500000 });

  await page.route("**/api/accounts", (route) => route.fulfill(json({ data: [{ id: "account-1", name: "Cash", type: "CASH", group: "REAL_MONEY", currency: "VND", active: true, creditCardId: null, openingBalance: 0, currentBalance: 0, currentDebt: 0 }] })));
  await page.route("**/api/finance/recurring-expenses*", async (route) => {
    if (route.request().method() === "POST") { recurring = [{ id: "recurring-1", name: "Internet", categoryId: "FOOD", accountId: "account-1", expectedAmount: 250000, frequency: "MONTHLY", nextDueDate: "2026-09-05", active: true }]; return route.fulfill(json({ data: recurring[0] }, 201)); }
    if (route.request().method() === "DELETE") { recurring = []; return route.fulfill(json({ data: { id: "recurring-1", name: "Internet", categoryId: "FOOD", accountId: "account-1", expectedAmount: 250000, frequency: "MONTHLY", nextDueDate: "2026-09-05", active: false } })); }
    return route.fulfill(json({ data: recurring }));
  });
  await page.route("**/api/finance/recurring-expenses/**", async (route) => {
    if (route.request().method() === "DELETE") { recurring = []; return route.fulfill(json({ data: { id: "recurring-1", name: "Internet", categoryId: "FOOD", accountId: "account-1", expectedAmount: 250000, frequency: "MONTHLY", nextDueDate: "2026-09-05", active: false } })); }
    return route.continue();
  });
  await page.goto("/recurring");
  await expect(page.getByText("Lịch chỉ là cấu hình nhắc việc")).toBeVisible();
  await page.getByLabel("Tên").fill("Internet");
  await page.getByLabel("Category ID").fill("FOOD");
  await page.getByLabel("Tài khoản").selectOption("account-1");
  await page.getByLabel("Số tiền dự kiến").fill("250000");
  await page.getByLabel("Ngày đến hạn tiếp theo").fill("2026-09-05");
  await page.getByRole("button", { name: "Lưu khoản định kỳ" }).click();
  await expect(page.getByText("Internet")).toBeVisible();
  await page.getByRole("button", { name: "Tắt" }).click();
  await expect(page.getByText("Chưa có khoản chi định kỳ.")).toBeVisible();
});
