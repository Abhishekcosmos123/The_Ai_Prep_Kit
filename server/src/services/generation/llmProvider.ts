import OpenAI from "openai";
import { z } from "zod";
import { env } from "../../config/env.js";
import { logger, preview } from "../../config/logger.js";
import { RateLimiter } from "../../utils/rateLimiter.js";
import { withRetry } from "../../utils/retry.js";
import { AppError } from "../../utils/errors.js";

export interface LLMGenerateOptions {
  system: string;
  user: string;
  temperature?: number;
  schemaHint?: string;
}

export interface LLMProvider {
  generateStructured<T>(schema: z.ZodType<T>, options: LLMGenerateOptions): Promise<T>;
}

const limiter = new RateLimiter(env.LLM_MIN_INTERVAL_MS);

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    const aStart = trimmed.indexOf("[");
    const aEnd = trimmed.lastIndexOf("]");
    if (aStart >= 0 && aEnd > aStart) {
      return JSON.parse(trimmed.slice(aStart, aEnd + 1));
    }
    throw new Error("Model response was not valid JSON");
  }
}

export class OpenAICompatibleProvider implements LLMProvider {
  private client: OpenAI;

  constructor() {
    if (!env.LLM_API_KEY) {
      throw new AppError(
        "LLM_NOT_CONFIGURED",
        "LLM_API_KEY is not set. Configure an OpenAI-compatible provider.",
        500
      );
    }
    this.client = new OpenAI({
      apiKey: env.LLM_API_KEY,
      baseURL: env.LLM_BASE_URL,
    });
  }

  async generateStructured<T>(schema: z.ZodType<T>, options: LLMGenerateOptions): Promise<T> {
    const task = detectTaskLabel(options.system);
    const startedAt = Date.now();
    logger.info("llm.request.start", {
      task,
      model: env.LLM_MODEL,
      user_chars: options.user.length,
      system_preview: preview(options.system, 100),
    });

    return limiter.schedule(() =>
      withRetry(
        async (attempt) => {
          const repairNote =
            attempt > 1
              ? `\n\nPrevious response failed validation. Attempt ${attempt}. Return ONLY valid JSON matching the required schema. Do not wrap fields differently.`
              : "";

          const schemaBlock = options.schemaHint
            ? `\nRequired JSON schema:\n${options.schemaHint}`
            : "";

          try {
            const completion = await this.client.chat.completions.create({
              model: env.LLM_MODEL,
              temperature: options.temperature ?? 0.2,
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "system",
                  content: `${options.system}${schemaBlock}\n\nRespond with a single JSON object only. No markdown.${repairNote}`,
                },
                { role: "user", content: options.user },
              ],
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) {
              logger.warn("llm.response.empty", { task, attempt });
              throw new Error("Empty LLM response");
            }

            logger.debug("llm.response.raw", {
              task,
              attempt,
              chars: content.length,
              preview: preview(content, 320),
              finish_reason: completion.choices[0]?.finish_reason,
              usage: completion.usage,
            });

            const parsed = extractJson(content);
            const result = schema.safeParse(parsed);
            if (!result.success) {
              logger.warn("llm.response.schema_invalid", {
                task,
                attempt,
                issues: result.error.issues.slice(0, 8).map((i) => ({
                  path: i.path.join("."),
                  message: i.message,
                  code: i.code,
                })),
                preview: preview(content, 400),
              });
              throw new Error(`LLM JSON failed schema validation: ${result.error.message}`);
            }

            logger.info("llm.request.ok", {
              task,
              attempt,
              elapsed_ms: Date.now() - startedAt,
              response_chars: content.length,
            });
            return result.data;
          } catch (error) {
            logger.warn("llm.request.attempt_failed", {
              task,
              attempt,
              elapsed_ms: Date.now() - startedAt,
              error: error instanceof Error ? preview(error.message, 400) : String(error),
            });
            throw error;
          }
        },
        {
          maxAttempts: env.LLM_MAX_RETRIES,
          baseDelayMs: 1000,
          onRetry: (error, attempt, delayMs) => {
            logger.warn("llm.retry", {
              task,
              attempt,
              delayMs,
              error: error instanceof Error ? preview(error.message, 400) : String(error),
            });
          },
          shouldRetry: (error) => {
            const message = error instanceof Error ? error.message.toLowerCase() : String(error);
            return (
              message.includes("429") ||
              message.includes("rate") ||
              message.includes("timeout") ||
              message.includes("503") ||
              message.includes("schema validation") ||
              message.includes("not valid json") ||
              message.includes("empty llm")
            );
          },
        }
      )
    );
  }
}

function detectTaskLabel(system: string): string {
  const match = system.match(/Task label[^:]*:\s*"([^"]+)"/i);
  if (match?.[1]) return match[1];
  const lower = system.toLowerCase();
  if (lower.includes("extract requirements")) return "extract requirements";
  if (lower.includes("company brief")) return "company brief";
  if (lower.includes("flashcard")) return "flashcards";
  if (lower.includes("gap")) return "gap questions";
  if (lower.includes("company-fit")) return "company-fit questions";
  if (lower.includes("system-design")) return "system-design questions";
  if (lower.includes("behavioural")) return "behavioural questions";
  if (lower.includes("technical interview")) return "technical questions";
  if (lower.includes("interview questions")) return "interview questions";
  return "unknown";
}

/** Deterministic mock for unit tests / offline scaffolding. */
export class MockLLMProvider implements LLMProvider {
  async generateStructured<T>(schema: z.ZodType<T>, options: LLMGenerateOptions): Promise<T> {
    const lower = `${options.system}\n${options.user}`.toLowerCase();

    let candidate: unknown;
    if (lower.includes("extract requirements")) {
      candidate = {
        company: "Example Co",
        role: "Software Engineer",
        location: "Remote",
        seniority: "mid",
        responsibilities: ["Build features", "Collaborate with team"],
        requirements: [
          {
            id: "r1",
            text: "Strong experience with TypeScript",
            kind: "technical",
            priority: "must",
          },
          {
            id: "r2",
            text: "Experience with REST APIs",
            kind: "technical",
            priority: "must",
          },
          {
            id: "r3",
            text: "Comfortable with behavioral interviews",
            kind: "behavioural",
            priority: "nice",
          },
        ],
      };
    } else if (lower.includes("company brief")) {
      candidate = {
        summary: "Example Co builds developer tools.",
        what_they_do: "They provide cloud collaboration products for engineering teams.",
        sources: [],
      };
    } else if (lower.includes("interview questions") || lower.includes("gap uncovered")) {
      let target = 3;
      let reqIds = ["r1", "r2", "r3"];
      let category = "technical";
      if (lower.includes("behavioural")) category = "behavioural";
      else if (lower.includes("system-design")) category = "system-design";
      else if (lower.includes("company-fit")) category = "company-fit";
      else if (lower.includes("gap") && lower.includes("behavioural")) category = "behavioural";

      // User payload may be JSON + untrusted research block — parse the first JSON object.
      try {
        const jsonMatch = options.user.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch?.[0] || options.user) as {
          target_question_count?: number;
          need?: number;
          category?: string;
          requirements?: Array<{ id: string }>;
        };
        target = Number(parsed.target_question_count || parsed.need || target);
        if (parsed.category) category = parsed.category;
        if (Array.isArray(parsed.requirements) && parsed.requirements.length) {
          reqIds = parsed.requirements.map((r) => r.id);
        }
      } catch {
        /* keep defaults */
      }
      target = Math.max(1, Math.min(target, 12));
      candidate = {
        questions: Array.from({ length: target }, (_, i) => {
          const rid = reqIds[i % reqIds.length] || "r1";
          const difficulty = ((i % 3) + 1) as 1 | 2 | 3;
          return {
            requirement_ids: [rid],
            category,
            prompt: `Mock ${category} question ${i + 1} covering ${rid}`,
            answer_outline: `Outline for ${category} question ${i + 1}`,
            difficulty,
          };
        }),
      };
    } else if (lower.includes("flashcard")) {
      let target = 6;
      let reqIds = ["r1", "r2"];
      try {
        const parsed = JSON.parse(options.user) as {
          target_flashcard_count?: number;
          requirements?: Array<{ id: string }>;
        };
        target = Number(parsed.target_flashcard_count || target);
        if (Array.isArray(parsed.requirements) && parsed.requirements.length) {
          reqIds = parsed.requirements.map((r) => r.id);
        }
      } catch {
        /* keep defaults */
      }
      target = Math.max(reqIds.length, Math.min(target, 30));
      candidate = {
        flashcards: Array.from({ length: target }, (_, i) => ({
          front: `Mock flashcard front ${i + 1}`,
          back: `Mock flashcard back ${i + 1}`,
          requirement_ids: [reqIds[i % reqIds.length]],
        })),
      };
    } else {
      candidate = {};
    }

    const result = schema.safeParse(candidate);
    if (!result.success) {
      throw new Error(`Mock LLM output invalid: ${result.error.message}`);
    }
    return result.data;
  }
}

let provider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (provider) return provider;
  if (process.env.LLM_PROVIDER === "mock" || !env.LLM_API_KEY) {
    logger.warn("Using MockLLMProvider (set LLM_API_KEY and LLM_PROVIDER=openai for real generation)");
    provider = new MockLLMProvider();
    return provider;
  }
  provider = new OpenAICompatibleProvider();
  return provider;
}

export function setLLMProvider(next: LLMProvider | null): void {
  provider = next;
}
