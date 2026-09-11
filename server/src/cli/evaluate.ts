/**
 * Batch evaluator — must allow local company fixtures (FAQ):
 * e.g. http://localhost:8099/acme/
 * Partial research that still produces a kit is status "ok".
 */
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { createPipeline } from "../services/pipeline/kitGenerationPipeline.js";
import {
  setLLMProvider,
  MockLLMProvider,
  getLLMProvider,
} from "../services/generation/llmProvider.js";
import { logger } from "../config/logger.js";

const caseSchema = z.object({
  id: z.string(),
  jd: z.string(),
  company_url: z.string(),
  days: z.number().int().positive(),
});

const inputSchema = z.array(caseSchema);

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--input" || a === "--output") {
      args[a.slice(2)] = argv[++i];
    }
    if (a === "--mock") args.mock = "1";
  }
  return args;
}

async function main() {
  // Evaluate fixtures may use http://localhost:8099/... (assessment FAQ).
  process.env.ALLOW_LOCAL_URLS = process.env.ALLOW_LOCAL_URLS || "true";

  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.output) {
    console.error(
      "Usage: npm run evaluate -- --input <cases.json> --output <kits.json> [--mock]"
    );
    process.exit(1);
  }

  if (args.mock) {
    setLLMProvider(new MockLLMProvider());
  } else {
    getLLMProvider();
  }

  const inputPath = path.resolve(args.input);
  const outputPath = path.resolve(args.output);
  const raw = JSON.parse(await fs.readFile(inputPath, "utf8"));
  const cases = inputSchema.parse(raw);

  const pipeline = createPipeline();
  const kits = [];

  for (const item of cases) {
    logger.info(`Evaluating case ${item.id}`);
    try {
      const result = await pipeline.generate({
        jd: item.jd,
        company_url: item.company_url,
        days: item.days,
        case_id: item.id,
      });

      // FAQ: partial research / incomplete coverage is still "ok" if a kit was produced.
      // Reserve "failed" for cases where no kit could be produced at all.
      if (result.kit) {
        kits.push({
          id: item.id,
          status: "ok",
          kit: result.kit,
          error: result.error,
        });
      } else {
        kits.push({
          id: item.id,
          status: "failed",
          kit: null,
          error: result.error || {
            code: "GENERATION_FAILED",
            message: "Unknown failure",
          },
        });
      }
    } catch (error) {
      kits.push({
        id: item.id,
        status: "failed",
        kit: null,
        error: {
          code: "GENERATION_FAILED",
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  const output = {
    version: "1.0",
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    kits,
  };

  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");
  logger.info(`Wrote ${kits.length} results to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
