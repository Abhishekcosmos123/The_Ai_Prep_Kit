import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:3000"),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  LLM_API_KEY: z.string().optional().default(""),
  LLM_MODEL: z.string().default("gpt-4o-mini"),
  LLM_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  MAX_COVERAGE_PASSES: z.coerce.number().int().positive().default(3),
  MAX_JD_CHARS: z.coerce.number().int().positive().default(50000),
  MAX_CRAWL_PAGES: z.coerce.number().int().positive().default(8),
  FETCH_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  LLM_MAX_RETRIES: z.coerce.number().int().positive().default(4),
  LLM_MIN_INTERVAL_MS: z.coerce.number().int().nonnegative().default(800),
  /** Allow localhost/private URLs (required for evaluate fixtures; keep false in public prod). */
  ALLOW_LOCAL_URLS: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1")
    .pipe(z.boolean())
    .default(false),
  LLM_PROVIDER: z.string().optional().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  if (process.env.NODE_ENV !== "test") {
    // Allow evaluate/tests to load with defaults when .env missing during bootstrap
  }
}

export const env = parsed.success
  ? parsed.data
  : envSchema.parse({
      MONGODB_URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/the_ai_prep_kit",
      JWT_SECRET: process.env.JWT_SECRET || "dev-only-secret-change-me",
      ...process.env,
    });
