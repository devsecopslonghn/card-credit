import fs from "node:fs/promises";
import path from "node:path";

const presetsPath = new URL("../data/card-presets.json", import.meta.url);
const outputDir = new URL("../public/card-images/generated/", import.meta.url);
const manifestPath = new URL("../data/card-image-manifest.json", import.meta.url);

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

await fs.mkdir(outputDir, { recursive: true });

const manifest = {};

for (const preset of presets) {
  if (!preset.imageUrl || !/^https?:\/\//.test(preset.imageUrl)) continue;

  try {
    const res = await fetch(preset.imageUrl, {
      headers: {
        "user-agent": "card-credit-image-cache/1.0",
      },
    });

    if (!res.ok) {
      console.warn(`Skip ${preset.id}: ${res.status} ${res.statusText}`);
      continue;
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      console.warn(`Skip ${preset.id}: unsupported content-type ${contentType}`);
      continue;
    }

    const extension = extensionFromUrl(preset.imageUrl) || extensionFromContentType(contentType) || ".img";
    const fileName = `${preset.id}${extension === ".jpeg" ? ".jpg" : extension}`;
    const filePath = new URL(fileName, outputDir);
    const buffer = Buffer.from(await res.arrayBuffer());

    await fs.writeFile(filePath, buffer);
    manifest[preset.id] = `/card-images/generated/${fileName}`;
    console.log(`Cached ${preset.id} -> ${manifest[preset.id]}`);
  } catch (error) {
    console.warn(`Skip ${preset.id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${Object.keys(manifest).length} cached image mapping(s).`);
