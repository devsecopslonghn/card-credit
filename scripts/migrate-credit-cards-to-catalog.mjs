#!/usr/bin/env node

import fs from "node:fs/promises";
import mongoose from "mongoose";
import rawCardPresets from "../data/card-presets.json" with { type: "json" };
import cardImageManifest from "../data/card-image-manifest.json" with { type: "json" };
import { createCatalogService } from "../lib/cardCatalogCore.mjs";
import { runCatalogMigration } from "../lib/catalogMigrationCore.mjs";

const usage = `Usage:
  npm run migrate:catalog -- [--dry-run] [--apply] [--output migration-report.json]

Options:
  --dry-run              Preview only. This is the default.
  --apply                Apply exact matches only.
  --output <path>        Write the full report as JSON.
  --help                 Show this help.

Safety:
  Dry-run never writes to MongoDB. Apply updates only exact matches and only sets:
  presetId, providerCode, providerName, displayName, network, catalogVersion, legacy=false.
`;

const parseArgs = (argv) => {
  const options = { apply: false, dryRun: true, output: null, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--apply") {
      options.apply = true;
      options.dryRun = false;
    } else if (arg === "--dry-run") {
      options.apply = false;
      options.dryRun = true;
    } else if (arg === "--output") {
      const output = argv[index + 1];
      if (!output || output.startsWith("--")) throw new Error("--output requires a file path.");
      options.output = output;
      index += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
};

const printReport = (report, { apply }) => {
  console.log(`Mode: ${apply ? "apply" : "dry-run"}`);
  console.log("Summary:");
  for (const [key, value] of Object.entries(report.summary)) {
    console.log(`  ${key}: ${value}`);
  }

  console.log("Details:");
  for (const detail of report.details) {
    const matched = detail.matchedPresetId ? ` matchedPresetId=${detail.matchedPresetId}` : "";
    console.log(
      `  cardId=${detail.cardId} bank=${detail.current.bank ?? ""} name=${detail.current.name ?? ""} type=${
        detail.current.type ?? ""
      } status=${detail.status}${matched} reason=${detail.reason}`,
    );
  }
};

const run = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is required.");

  const catalogService = createCatalogService(rawCardPresets, cardImageManifest);
  const products = catalogService.getAllCatalogProducts();

  await mongoose.connect(mongoUri);
  try {
    const cards = await mongoose.connection.collection("creditcards").find({}).toArray();
    const report = await runCatalogMigration({
      cards,
      products,
      apply: options.apply,
      updateCard: async (cardId, update) => {
        const result = await mongoose.connection.collection("creditcards").updateOne(
          {
            _id: new mongoose.Types.ObjectId(cardId),
            $or: [{ presetId: null }, { presetId: { $exists: false } }],
          },
          { $set: update },
        );
        return { matched: result.matchedCount, modified: result.modifiedCount };
      },
    });

    printReport(report, options);

    if (options.output) {
      await fs.writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
      console.log(`Report written to ${options.output}`);
    }
  } finally {
    await mongoose.disconnect();
  }
};

run().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
