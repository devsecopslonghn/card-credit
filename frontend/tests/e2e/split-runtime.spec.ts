import { expect, test } from "@playwright/test";

test.describe("isolated split runtime", () => {
  test.skip(
    process.env.PLAYWRIGHT_EXTERNAL_SERVER !== "true",
    "Requires the isolated Compose stack.",
  );
  test("registers through frontend proxy and reaches workspace-scoped backend APIs", async ({
    page,
  }) => {
    await page.goto("/register");
    await page.getByLabel("Tên hiển thị").fill("Phase 10 User");
    await page.getByLabel("Email").fill("phase10@example.test");
    await page.getByLabel("Mật khẩu").fill("phase10-password");
    await page.getByLabel("Workspace").fill("phase10-workspace");
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page).toHaveURL(/\/cards$/);
    await expect(
      page.getByRole("heading", { name: "Thẻ Tín Dụng" }),
    ).toBeVisible();

    const result = await page.evaluate(async () => {
      const [me, cards, transactions, reports] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/cards"),
        fetch("/api/card-transactions"),
        fetch("/api/reports/summary"),
      ]);
      return {
        me: { status: me.status, body: await me.json() },
        cards: { status: cards.status, body: await cards.json() },
        transactions: {
          status: transactions.status,
          body: await transactions.json(),
        },
        reports: { status: reports.status, body: await reports.json() },
      };
    });
    expect(result.me.status).toBe(200);
    expect(result.me.body.user).toMatchObject({
      email: "phase10@example.test",
      role: "admin",
      workspaceId: "phase10-workspace",
    });
    expect(result.cards).toEqual({ status: 200, body: [] });
    expect(result.transactions).toEqual({ status: 200, body: { data: [] } });
    expect(result.reports.status).toBe(200);
    expect(result.reports.body.cards).toEqual([]);
  });
});
