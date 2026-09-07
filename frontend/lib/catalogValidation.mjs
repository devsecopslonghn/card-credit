import fs from "node:fs/promises";

export const readCatalogJson = async (url, fallback) => {
  try {
    return JSON.parse(await fs.readFile(url, "utf8"));
  } catch (error) {
    if (fallback !== undefined) return fallback;
    throw error;
  }
};
