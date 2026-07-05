import fs from "node:fs/promises";
import path from "node:path";
import { CARD_IMAGE_PLACEHOLDER_URL } from "../lib/cardCatalogCore.mjs";
import { errorContext, logInfo, logWarn } from "../lib/observability/logger.mjs";

const presetsPath = new URL("../data/card-presets.json", import.meta.url);
const outputDir = new URL("../public/card-images/generated/", import.meta.url);
const manifestPath = new URL("../data/card-image-manifest.json", import.meta.url);
const checkedAt = new Date().toISOString();

const presets = JSON.parse(await fs.readFile(presetsPath, "utf8"));

const extensionFromContentType = (contentType) => {
  if (contentType.includes("image/png")) return ".png";
  if (contentType.includes("image/jpeg")) return ".jpg";
  if (contentType.includes("image/webp")) return ".webp";
  if (contentType.includes("image/svg")) return ".svg";
  return "";
};

const extensionFromUrl = (url) => {
  const pathname = new URL(url).pathname.toLowerCase();
  const extension = path.extname(pathname);
  return [".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(extension) ? extension : "";
};

const manifestKey = (preset) => preset.presetId ?? preset.id;

const placeholderEntry = (preset, reason) => ({
  status: "placeholder",
  sourceUrl: preset.imageUrl ?? null,
  localPath: CARD_IMAGE_PLACEHOLDER_URL,
  reason,
  checkedAt,
});

await fs.mkdir(outputDir, { recursive: true });

const manifest = {};

for (const preset of presets) {
  const key = manifestKey(preset);

  if (!preset.imageUrl) {
    manifest[key] = placeholderEntry(preset, "empty imageUrl");
    continue;
  }

  if (!/^https?:\/\//.test(preset.imageUrl)) {
    manifest[key] = placeholderEntry(preset, "non-remote imageUrl");
    continue;
  }

  try {
    const res = await fetch(preset.imageUrl, {
      headers: {
        "user-agent": "card-credit-image-cache/1.0",
      },
    });

    if (!res.ok) {
      manifest[key] = {
        status: "failed",
        sourceUrl: preset.imageUrl,
        localPath: CARD_IMAGE_PLACEHOLDER_URL,
        reason: `${res.status} ${res.statusText}`,
        checkedAt,
      };
      logWarn("IMAGE_DOWNLOAD_FAILURE", {
        presetId: key,
        status: res.status,
        reason: res.statusText,
      });
      console.warn(`Use placeholder for ${key}: ${res.status} ${res.statusText}`);
      continue;
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      manifest[key] = {
        status: "failed",
        sourceUrl: preset.imageUrl,
        localPath: CARD_IMAGE_PLACEHOLDER_URL,
        reason: `unsupported content-type ${contentType}`,
        checkedAt,
      };
      logWarn("IMAGE_DOWNLOAD_FAILURE", {
        presetId: key,
        reason: "unsupported content-type",
        contentType,
      });
      console.warn(`Use placeholder for ${key}: unsupported content-type ${contentType}`);
      continue;
    }

    const extension = extensionFromUrl(preset.imageUrl) || extensionFromContentType(contentType) || ".img";
    const fileName = `${key}${extension === ".jpeg" ? ".jpg" : extension}`;
    const filePath = new URL(fileName, outputDir);
    const buffer = Buffer.from(await res.arrayBuffer());

    await fs.writeFile(filePath, buffer);
    manifest[key] = {
      status: "cached",
      sourceUrl: preset.imageUrl,
      localPath: `/card-images/generated/${fileName}`,
      checkedAt,
    };
    logInfo("IMAGE_DOWNLOAD_SUCCESS", {
      presetId: key,
      localPath: manifest[key].localPath,
      contentType,
    });
    console.log(`Cached ${key} -> ${manifest[key].localPath}`);
  } catch (error) {
    manifest[key] = {
      status: "failed",
      sourceUrl: preset.imageUrl,
      localPath: CARD_IMAGE_PLACEHOLDER_URL,
      reason: error instanceof Error ? error.message : String(error),
      checkedAt,
    };
    logWarn("IMAGE_DOWNLOAD_FAILURE", {
      presetId: key,
      ...errorContext(error),
    });
    console.warn(`Use placeholder for ${key}: ${manifest[key].reason}`);
  }
}

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${Object.keys(manifest).length} image manifest entrie(s).`);
