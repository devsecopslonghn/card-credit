import { expect, test, type Page, type Route } from "@playwright/test";

type CatalogProduct = {
  presetId: string;
  providerCode: string;
  providerName: string;
  displayName: string;
  network: string;
  annualFee: number | null;
  targetSpendForWaiver?: number | null;
  imageUrl: string;
  sourceUrl?: string;
  sourceCheckedAt?: string;
  active: boolean;
  sortOrder?: number;
};

type CreditCard = {
  _id: string;
  presetId?: string | null;
  providerCode?: string | null;
  providerName?: string | null;
  displayName?: string | null;
  network?: string | null;
  legacy?: boolean;
  bank?: string;
  name?: string;
  type?: string;
  owner?: string;
  imageUrl?: string;
  annualFee?: number | null;
  targetSpendForWaiver?: number;
  statementDate?: string;
  paymentDueDate?: string;
  amountDueThisMonth?: number;
  isPaidThisMonth?: boolean;
  monthlyData?: Array<{ month: number; spend: number; cashback: number; fee: number; otherInterest: number }>;
};

const placeholderImage = "/card-images/placeholder-card.svg";

const sacombankProduct: CatalogProduct = {
  presetId: "sacombank-visa-platinum-cashback",
  providerCode: "SACOMBANK",
  providerName: "Sacombank",
  displayName: "Visa Platinum Cashback",
  network: "Visa",
  annualFee: 999000,
  targetSpendForWaiver: 100000000,
  imageUrl: placeholderImage,
  sourceUrl: "https://example.test/sacombank-visa-platinum-cashback",
  sourceCheckedAt: "2026-01-01",
  active: true,
  sortOrder: 1,
};

const inactiveProduct: CatalogProduct = {
  presetId: "sacombank-inactive-product",
  providerCode: "SACOMBANK",
  providerName: "Sacombank",
  displayName: "Inactive Catalog Product",
  network: "Visa",
  annualFee: null,
  imageUrl: placeholderImage,
  active: false,
  sortOrder: 99,
};

const initialCards: CreditCard[] = [
  {
    _id: "legacy-card-1",
    legacy: true,
    bank: "Legacy Bank",
    name: "Classic Legacy Card",
    type: "Mastercard",
    owner: "Ba",
    imageUrl: placeholderImage,
    annualFee: null,
    targetSpendForWaiver: 0,
    statementDate: "2026-07-10",
    paymentDueDate: "2026-07-25",
    amountDueThisMonth: 100000,
    isPaidThisMonth: false,
  },
];

const defaultMonthlyData = () =>
  Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    spend: 0,
    cashback: 0,
    fee: 0,
    otherInterest: 0,
  }));

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

async function mockCardApis(page: Page, cardFixture: CreditCard[] = initialCards) {
  let cards = structuredClone(cardFixture);
  const createRequests: unknown[] = [];
  const updateRequests: Array<{ id: string; body: unknown }> = [];
  const deleteRequests: string[] = [];

  await page.route("**/api/notes**", (route) => json(route, []));

  await page.route("**/api/card-catalog/providers", (route) =>
    json(route, {
      data: [
        {
          providerCode: "SACOMBANK",
          providerName: "Sacombank",
          products: [sacombankProduct, inactiveProduct],
        },
      ],
    }),
  );

  await page.route("**/api/card-catalog/products**", (route) => {
    const url = new URL(route.request().url());
    const providerCode = url.searchParams.get("provider");
    const products = providerCode === "SACOMBANK" ? [sacombankProduct] : [];
    return json(route, { data: products });
  });

  await page.route(/\/api\/cards(?:\?.*)?$/, async (route) => {
    const method = route.request().method();

    if (method === "GET") return json(route, cards);

    if (method === "POST") {
      const body = await route.request().postDataJSON();
      createRequests.push(body);

      if (JSON.stringify(Object.keys(body).sort()) !== JSON.stringify(["owner", "presetId"])) {
        return json(route, { error: { message: "Unexpected create payload." } }, 400);
      }

      const createdCard: CreditCard = {
        _id: "created-card-1",
        presetId: sacombankProduct.presetId,
        providerCode: sacombankProduct.providerCode,
        providerName: sacombankProduct.providerName,
        displayName: sacombankProduct.displayName,
        network: sacombankProduct.network,
        owner: body.owner,
        imageUrl: sacombankProduct.imageUrl,
        annualFee: sacombankProduct.annualFee,
        targetSpendForWaiver: sacombankProduct.targetSpendForWaiver ?? 0,
        statementDate: "",
        paymentDueDate: "",
        amountDueThisMonth: 0,
        isPaidThisMonth: false,
        monthlyData: defaultMonthlyData(),
      };
      cards = [...cards, createdCard];
      return json(route, createdCard, 201);
    }

    return route.fallback();
  });

  await page.route("**/api/cards/*", async (route) => {
    const method = route.request().method();
    const id = new URL(route.request().url()).pathname.split("/").pop() ?? "";

    if (method === "PUT") {
      const body = await route.request().postDataJSON();
      updateRequests.push({ id, body });
      const existing = cards.find((card) => card._id === id);
      if (!existing) return json(route, { error: { message: "Card not found." } }, 404);

      const updatedCard = { ...existing, ...body };
      cards = cards.map((card) => (card._id === id ? updatedCard : card));
      return json(route, updatedCard);
    }

    if (method === "DELETE") {
      deleteRequests.push(id);
      cards = cards.filter((card) => card._id !== id);
      return route.fulfill({ status: 204 });
    }

    return route.fallback();
  });

  return {
    getCards: () => cards,
    createRequests,
    updateRequests,
    deleteRequests,
  };
}

test.describe("CC-033 card catalog E2E", () => {
  test("desktop catalog-first create, detail update, mark paid, and delete flow", async ({ page }) => {
    test.skip(page.viewportSize()?.width === 375, "Main desktop flow runs in the desktop project.");
    const api = await mockCardApis(page);

    await page.goto("/cards");
    await expect(page.getByRole("heading", { name: "Thẻ Tín Dụng" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Legacy Bank/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Classic Legacy Card" })).toBeVisible();
    await expect(page.getByText("Legacy", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Thêm thẻ mới" }).click();
    await expect(page.getByRole("dialog", { name: "Thêm thẻ từ Card Catalog" })).toBeVisible();
    await page.getByRole("radio", { name: /Sacombank/ }).click();
    await expect(page.getByRole("radio", { name: /Inactive Catalog Product/ })).toHaveCount(0);
    await page.getByRole("radio", { name: /Visa Platinum Cashback/ }).click();
    await page.getByLabel("Chủ thẻ").fill("Long Ho");
    await page.getByRole("button", { name: "Tạo thẻ" }).click();

    await expect.poll(() => api.createRequests).toHaveLength(1);
    expect(api.createRequests[0]).toEqual({
      presetId: "sacombank-visa-platinum-cashback",
      owner: "Long Ho",
    });

    const sacombankSection = page.getByRole("region", { name: /Sacombank \(1\)/ });
    await expect(sacombankSection.getByText("Visa Platinum Cashback")).toBeVisible();
    await expect(sacombankSection.getByText("Thẻ của: Long Ho")).toBeVisible();

    await page.getByRole("link", { name: "Mở chi tiết Visa Platinum Cashback" }).click();
    await expect(page).toHaveURL(/\/cards\/created-card-1$/);
    await expect(page.getByRole("heading", { level: 1, name: "Visa Platinum Cashback" })).toBeVisible();

    await page.getByRole("button", { name: "Sửa thông tin vận hành" }).click();
    const operationalDialog = page.getByRole("dialog", { name: "Sửa thông tin vận hành" });
    await expect(operationalDialog).toBeVisible();
    await operationalDialog.locator('input[type="text"]').nth(1).fill("2500000");
    await page.getByRole("button", { name: "Cập nhật" }).click();
    await expect.poll(() => api.updateRequests.some((request) => request.body && (request.body as CreditCard).amountDueThisMonth === 2500000)).toBe(true);
    await expect(page.getByText("2.500.000 ₫")).toBeVisible();

    await page.getByRole("link", { name: /Quay lại danh sách thẻ/ }).click();
    await expect(page).toHaveURL(/\/cards$/);
    await page.getByLabel("Đánh dấu đã thanh toán Visa Platinum Cashback").check();
    await expect.poll(() => api.updateRequests.some((request) => request.body && (request.body as CreditCard).isPaidThisMonth === true)).toBe(true);
    await expect(sacombankSection.getByText("Đã thanh toán")).toBeVisible();

    await page.getByRole("button", { name: "Xóa Visa Platinum Cashback" }).click();
    await page.getByRole("button", { name: "Đồng ý xóa" }).click();
    await expect.poll(() => api.deleteRequests).toEqual(["created-card-1"]);
    await expect(page.getByText("Visa Platinum Cashback")).toHaveCount(0);
    expect(api.getCards().map((card) => card._id)).not.toContain("created-card-1");
  });

  test("blocks empty owner before creating a card", async ({ page }) => {
    test.skip(page.viewportSize()?.width === 375, "Validation is covered in the desktop project.");
    const api = await mockCardApis(page);

    await page.goto("/cards");
    await page.getByRole("button", { name: "Thêm thẻ mới" }).click();
    await page.getByRole("radio", { name: /Sacombank/ }).click();
    await page.getByRole("radio", { name: /Visa Platinum Cashback/ }).click();
    await page.getByLabel("Chủ thẻ").fill("   ");
    await page.getByRole("button", { name: "Tạo thẻ" }).click();

    await expect(page.getByText("Vui lòng nhập chủ thẻ.")).toBeVisible();
    expect(api.createRequests).toHaveLength(0);
  });

  test("modal supports keyboard use, escape close, and focus return", async ({ page }) => {
    test.skip(page.viewportSize()?.width === 375, "Keyboard interaction is covered in the desktop project.");
    const api = await mockCardApis(page);

    await page.goto("/cards");
    const addButton = page.getByRole("button", { name: "Thêm thẻ mới" });
    await addButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Thêm thẻ từ Card Catalog" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Thêm thẻ từ Card Catalog" })).toHaveCount(0);
    await expect(addButton).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Thêm thẻ từ Card Catalog" })).toBeVisible();
    await page.getByRole("radio", { name: /Sacombank/ }).focus();
    await page.keyboard.press("Space");
    await page.getByRole("radio", { name: /Visa Platinum Cashback/ }).focus();
    await page.keyboard.press("Enter");
    await page.getByLabel("Chủ thẻ").focus();
    await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
    await page.keyboard.type("Keyboard User");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Tạo thẻ" })).toBeFocused();
    await page.keyboard.press("Enter");

    await expect.poll(() => api.createRequests).toEqual([
      {
        presetId: "sacombank-visa-platinum-cashback",
        owner: "Keyboard User",
      },
    ]);
  });

  test("mobile viewport has no horizontal page scroll", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile layout assertion only runs in the mobile project.");
    await mockCardApis(page);

    await page.goto("/cards");
    await expect(page.getByRole("heading", { name: "Classic Legacy Card" })).toBeVisible();

    const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasHorizontalScroll).toBe(false);
  });
});

test.describe("CC-034 card edge cases E2E", () => {
  test("renders missing, broken, data URI, long-name and empty-date cards without broken UI", async ({ page }) => {
    test.skip(page.viewportSize()?.width === 375, "Edge rendering is covered once in the desktop project.");
    const longName =
      "Zero Fee Empty Image Product With An Extremely Long Official Display Name For Layout Regression Coverage";
    const dataUri =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='100'%3E%3Crect width='160' height='100' fill='%230f766e'/%3E%3C/svg%3E";

    await page.route("**/card-images/does-not-exist.png", (route) => route.fulfill({ status: 404 }));
    await mockCardApis(page, [
      {
        _id: "edge-empty-image",
        presetId: "edge-zero-fee",
        providerCode: "EDGE",
        providerName: "Edge Bank",
        displayName: longName,
        network: "Visa",
        owner: "Long Ho",
        imageUrl: "",
        annualFee: 0,
        statementDate: "",
        paymentDueDate: "",
        amountDueThisMonth: undefined,
      },
      {
        _id: "edge-broken-image",
        presetId: "edge-null-fee",
        providerCode: "EDGE",
        providerName: "Edge Bank",
        displayName: "Broken Image Product",
        network: "Visa",
        owner: "Long Ho",
        imageUrl: "/card-images/does-not-exist.png",
        annualFee: null,
      },
      {
        _id: "edge-data-uri-legacy",
        legacy: true,
        bank: "Legacy Data Bank",
        name: "Legacy Data URI Product",
        type: "Mastercard",
        owner: "Long Ho",
        imageUrl: dataUri,
        annualFee: null,
        paymentDueDate: "",
        statementDate: "",
      },
    ]);

    await page.goto("/cards");
    await expect(page.getByRole("heading", { name: longName })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Broken Image Product" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Legacy Data URI Product" })).toBeVisible();
    await expect(page.getByText("0 ₫").first()).toBeVisible();
    await expect(page.getByText("Chưa xác định").first()).toBeVisible();
    await expect(page.getByText("Chưa thiết lập").first()).toBeVisible();

    const emptyImage = page.getByAltText(`Edge Bank ${longName}`);
    await expect(emptyImage).toHaveAttribute("src", "/card-images/placeholder-card.svg");

    const brokenImage = page.getByAltText("Edge Bank Broken Image Product");
    await expect.poll(async () => brokenImage.getAttribute("src")).toBe("/card-images/placeholder-card.svg");

    await expect(page.getByAltText("Legacy Data Bank Legacy Data URI Product")).toHaveAttribute("src", dataUri);
    await expect(page.locator("body")).not.toContainText("NaN");
    await expect(page.locator("body")).not.toContainText("undefinedđ");
  });
});
