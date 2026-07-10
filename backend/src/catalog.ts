import { readFile } from "node:fs/promises";
import path from "node:path";
import { ApiError } from "./errors.js";

type Product = Record<string, unknown> & {
  presetId: string;
  providerCode: string;
  providerName: string;
  active: boolean;
  sortOrder?: number;
};

const stripLegacy = (product: Product) => {
  const result = { ...product };
  for (const key of ["id", "bank", "bankName", "name", "type"]) delete result[key];
  return result;
};

export class CatalogRepository {
  constructor(private readonly dataDir: string) {}

  private async products(): Promise<Product[]> {
    const raw = await readFile(path.resolve(this.dataDir, "card-presets.json"), "utf8");
    return (JSON.parse(raw) as Product[]).sort((a, b) => (a.sortOrder ?? 999999) - (b.sortOrder ?? 999999));
  }

  async providers() {
    const groups = new Map<string, { providerCode: string; providerName: string; products: object[] }>();
    for (const product of (await this.products()).filter((item) => item.active)) {
      const group = groups.get(product.providerCode) ?? {
        providerCode: product.providerCode,
        providerName: product.providerName,
        products: [],
      };
      group.products.push(stripLegacy(product));
      groups.set(product.providerCode, group);
    }
    return { data: [...groups.values()].sort((a, b) => a.providerName.localeCompare(b.providerName)) };
  }

  async list(provider?: string) {
    const normalized = provider?.trim().toUpperCase();
    const products = (await this.products()).filter(
      (item) => item.active && (!normalized || item.providerCode === normalized),
    );
    if (normalized && products.length === 0) {
      throw new ApiError(404, "PROVIDER_NOT_FOUND", "Không tìm thấy provider đang hoạt động.", { provider: normalized });
    }
    return { data: products.map(stripLegacy) };
  }

  async detail(presetId: string) {
    const product = (await this.products()).find((item) => item.presetId === presetId && item.active);
    if (!product) throw new ApiError(404, "PRESET_NOT_FOUND", "Không tìm thấy Card Product.");
    return { data: stripLegacy(product) };
  }
}
