import fs from "node:fs/promises";

const presetPath = new URL("../data/card-presets.json", import.meta.url);
const presets = JSON.parse(await fs.readFile(presetPath, "utf8"));

const stripHtml = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractAnnualFeeHints = (text) => {
  const hints = [];
  const normalized = text.normalize("NFC");
  const feePattern = /(?:phí thường niên|annual fee).{0,180}?(?:\d[\d.,\s]*(?:VNĐ|VND|đồng)|miễn phí)/giu;

  for (const match of normalized.matchAll(feePattern)) {
    hints.push(match[0].trim());
    if (hints.length >= 3) break;
  }

  return hints;
};

for (const preset of presets) {
  try {
    const res = await fetch(preset.sourceUrl, {
      headers: {
        "user-agent": "card-credit-catalog-crawler/1.0",
      },
    });

    const contentType = res.headers.get("content-type") || "";
    const isHtml = contentType.includes("text/html");
    const html = isHtml ? await res.text() : "";
    const hints = isHtml ? extractAnnualFeeHints(stripHtml(html)) : [];

    console.log(
      JSON.stringify(
        {
          id: preset.id,
          status: res.status,
          contentType,
          sourceUrl: preset.sourceUrl,
          annualFee: preset.annualFee,
          hints,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          id: preset.id,
          sourceUrl: preset.sourceUrl,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
  }
}
