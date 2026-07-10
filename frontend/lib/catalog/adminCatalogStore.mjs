import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const catalogPath = path.join(process.cwd(), "data", "card-presets.json");

export const readCatalogProducts = async () => JSON.parse(await readFile(catalogPath, "utf8"));

export const writeCatalogProducts = async (products) => {
  await writeFile(catalogPath, `${JSON.stringify(products, null, 2)}\n`);
};

