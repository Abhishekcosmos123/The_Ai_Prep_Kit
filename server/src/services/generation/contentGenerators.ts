import { z } from "zod";
import { v4 as uuid } from "uuid";
import {
  normalizeRequirementKind,
  type Requirement,
  type RequirementKind,
  type RequirementPriority,
} from "../../types/kit.js";
import type { LLMProvider } from "./llmProvider.js";
import { wrapUntrustedContent, truncate } from "../../utils/textCleaner.js";

const KIND_SET = new Set<RequirementKind>([
  "technical",
  "behavioural",
  "domain",
  "experience",
  "other",
]);

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          return asString(obj.text ?? obj.description ?? obj.title ?? obj.name);
        }
        return "";
      })
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\n|;/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function coerceKind(value: unknown, fallback: RequirementKind = "other"): RequirementKind {
  const raw = asString(value).toLowerCase().trim();
  if (!raw) return fallback;
  return normalizeRequirementKind(raw);
}

function coercePriority(value: unknown, text = ""): RequirementPriority {
  const raw = asString(value).toLowerCase();
  if (raw === "must" || raw === "required" || raw === "mandatory") return "must";
  if (raw === "nice" || raw === "preferred" || raw === "optional") return "nice";
  const hay = `${raw} ${text}`.toLowerCase();
  if (/\b(must|required|minimum|mandatory|need to|5\+\s*years|strong experience)\b/.test(hay)) {
    return "must";
  }
  if (/\b(nice|preferred|optional|plus|bonus)\b/.test(hay)) return "nice";
  return "must";
}

function normalizeRequirementItem(
  item: unknown,
  fallbackKind: RequirementKind = "other"
): { text: string; kind: RequirementKind; priority: RequirementPriority } | null {
  if (typeof item === "string") {
    const text = item.trim();
    if (!text) return null;
    return { text, kind: fallbackKind, priority: coercePriority(undefined, text) };
  }
  if (!item || typeof item !== "object") return null;
  const obj = item as Record<string, unknown>;
  const text = asString(
    obj.text ?? obj.requirement ?? obj.description ?? obj.title ?? obj.name
  ).trim();
  if (!text) return null;
  return {
    text,
    kind: coerceKind(obj.kind ?? obj.category ?? obj.type, fallbackKind),
    priority: coercePriority(obj.priority ?? obj.importance, text),
  };
}

/**
 * Models often return alternate shapes (nested requirements by kind, missing meta fields).
 * Normalize before Zod so retries are not wasted on recoverable structure differences.
 */
export function normalizeExtractionPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;

  const root = raw as Record<string, unknown>;
  const nestedCandidates = [root.data, root.result, root.extraction, root.output, root.job];
  const base =
    nestedCandidates.find((c) => c && typeof c === "object" && !Array.isArray(c)) ?? root;
  const data = { ...(base as Record<string, unknown>) };

  const meta = (data.meta && typeof data.meta === "object" ? data.meta : {}) as Record<
    string,
    unknown
  >;
  const roleObj =
    data.role && typeof data.role === "object" && !Array.isArray(data.role)
      ? (data.role as Record<string, unknown>)
      : null;

  const company = asString(
    data.company ?? data.company_name ?? data.companyName ?? meta.company ?? root.company,
    "Unknown company"
  );
  const role = asString(
    (typeof data.role === "string" ? data.role : null) ??
      roleObj?.title ??
      data.role_title ??
      data.job_title ??
      data.title ??
      meta.role,
    "Unknown role"
  );
  const location = asString(
    data.location ?? data.job_location ?? roleObj?.location ?? meta.location,
    "Unspecified"
  );
  const seniority = asString(
    data.seniority ?? data.level ?? roleObj?.seniority ?? meta.seniority,
    "unspecified"
  );
  const responsibilities = asStringArray(
    data.responsibilities ?? data.responsibility ?? roleObj?.responsibilities ?? data.duties
  );

  let requirementsRaw: unknown = data.requirements ?? data.requirement_list ?? data.reqs;

  // Shape: { requirements: { technical: [...], behavioural|behavioral: [...] } }
  if (requirementsRaw && typeof requirementsRaw === "object" && !Array.isArray(requirementsRaw)) {
    const grouped = requirementsRaw as Record<string, unknown>;
    const flattened: Array<{ text: string; kind: RequirementKind; priority: RequirementPriority }> =
      [];
    for (const [key, value] of Object.entries(grouped)) {
      const kind = coerceKind(key);
      if (Array.isArray(value)) {
        for (const item of value) {
          const normalized = normalizeRequirementItem(item, kind);
          if (normalized) flattened.push(normalized);
        }
      } else {
        const normalized = normalizeRequirementItem(value, kind);
        if (normalized) flattened.push(normalized);
      }
    }
    requirementsRaw = flattened;
  }

  // Shape: top-level technical/behavioural arrays instead of requirements
  if (!Array.isArray(requirementsRaw) || requirementsRaw.length === 0) {
    const flattened: Array<{ text: string; kind: RequirementKind; priority: RequirementPriority }> =
      [];
    for (const kind of KIND_SET) {
      const bucket =
        data[kind] ??
        data[`${kind}_requirements`] ??
        (kind === "behavioural" ? data.behavioral ?? data.behavioral_requirements : undefined);
      if (!bucket) continue;
      if (Array.isArray(bucket)) {
        for (const item of bucket) {
          const normalized = normalizeRequirementItem(item, kind);
          if (normalized) flattened.push(normalized);
        }
      }
    }
    if (flattened.length > 0) requirementsRaw = flattened;
  }

  const requirements = Array.isArray(requirementsRaw)
    ? requirementsRaw
        .map((item) => normalizeRequirementItem(item))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];

  return {
    company,
    role,
    location,
    seniority,
    responsibilities,
    requirements,
  };
}

const requirementItemSchema = z.object({
  text: z.string().min(1),
  kind: z.enum(["technical", "behavioural", "domain", "experience", "other"]),
  priority: z.enum(["must", "nice"]),
});

const extractionSchema = z.preprocess(
  normalizeExtractionPayload,
  z.object({
    company: z.string().default("Unknown company"),
    role: z.string().default("Unknown role"),
    location: z.string().default("Unspecified"),
    seniority: z.string().default("unspecified"),
    responsibilities: z.array(z.string()).default([]),
    requirements: z.array(requirementItemSchema).default([]),
  })
);

const EXTRACTION_SCHEMA_HINT = `{
  "company": "string",
  "role": "string",
  "location": "string",
  "seniority": "string",
  "responsibilities": ["string"],
  "requirements": [
    {
      "text": "string",
      "kind": "technical|behavioural|domain|experience|other",
      "priority": "must|nice"
    }
  ]
}`;

export class RequirementExtractor {
  constructor(private readonly llm: LLMProvider) {}

  async extract(jd: string): Promise<{
    company: string;
    role: string;
    location: string;
    seniority: string;
    responsibilities: string[];
    requirements: Requirement[];
  }> {
    const result = await this.llm.generateStructured(extractionSchema, {
      system: [
        "You extract structured hiring requirements from a job description.",
        "Do not invent requirements that are not supported by the JD.",
        "If the JD is very short, return a small set of requirements.",
        "Mark priority must for required/must-have/minimum/years wording; nice for preferred/optional.",
        "Return ONE flat JSON object with EXACTLY these top-level keys:",
        "company, role, location, seniority, responsibilities, requirements.",
        "requirements MUST be an array of objects (never an object keyed by category).",
        `Exact schema: ${EXTRACTION_SCHEMA_HINT}`,
        'Task label for routing: "extract requirements".',
      ].join(" "),
      user: wrapUntrustedContent("JOB_DESCRIPTION", truncate(jd, 40000)),
      schemaHint: EXTRACTION_SCHEMA_HINT,
    });

    const requirements: Requirement[] = result.requirements.map((r, index) => ({
      id: `r${index + 1}`,
      text: r.text.trim(),
      kind: r.kind,
      priority: r.priority,
    }));

    return {
      company: result.company.trim() || "Unknown company",
      role: result.role.trim() || "Unknown role",
      location: result.location.trim() || "Unspecified",
      seniority: result.seniority.trim() || "unspecified",
      responsibilities: result.responsibilities.map((x) => x.trim()).filter(Boolean),
      requirements,
    };
  }
}

const briefSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(z.string()).optional().default([]),
});

export class CompanyBriefGenerator {
  constructor(private readonly llm: LLMProvider) {}

  async generate(input: {
    companyName: string;
    pages: Array<{ url: string; text: string }>;
    notes: string[];
  }) {
    if (input.pages.length === 0) {
      return {
        summary:
          input.notes.join(" ") ||
          "Company website content could not be retrieved. Brief is limited.",
        what_they_do: "Insufficient public page content was available to describe what they do.",
        sources: [] as string[],
      };
    }

    const corpus = input.pages
      .slice(0, 6)
      .map((p) => `SOURCE_URL: ${p.url}\n${truncate(p.text, 3000)}`)
      .join("\n\n");

    const result = await this.llm.generateStructured(briefSchema, {
      system: [
        "Generate a factual company brief for interview prep.",
        "Only use provided page data. Do not invent facts.",
        "If information is missing, say so plainly.",
        'Return JSON: { "summary": string, "what_they_do": string, "sources": string[] }',
        'Task label: "company brief".',
      ].join(" "),
      user: [
        `Company name hint: ${input.companyName}`,
        `Research notes: ${input.notes.join(" | ") || "none"}`,
        wrapUntrustedContent("COMPANY_PAGES", corpus),
      ].join("\n\n"),
    });

    return {
      summary: result.summary,
      what_they_do: result.what_they_do,
      sources: result.sources.length
        ? result.sources
        : input.pages.map((p) => p.url),
    };
  }
}

const questionsSchemaStrict = z.preprocess((raw) => {
  if (!raw || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;
  const list = obj.questions ?? obj.items ?? obj.data;
  if (!Array.isArray(list)) return { questions: [] };
  return {
    questions: list.map((item) => {
      if (!item || typeof item !== "object") return item;
      const q = item as Record<string, unknown>;
      let difficulty = Number(q.difficulty ?? 2);
      if (![1, 2, 3].includes(difficulty)) difficulty = 2;
      const requirement_ids = Array.isArray(q.requirement_ids)
        ? q.requirement_ids.map(String)
        : q.requirement_id
          ? [String(q.requirement_id)]
          : [];
      return {
        requirement_ids,
        category: asString(q.category ?? q.kind, "general"),
        prompt: asString(q.prompt ?? q.question ?? q.text),
        answer_outline: asString(q.answer_outline ?? q.answerOutline ?? q.outline ?? q.answer),
        difficulty,
      };
    }),
  };
}, z.object({
  questions: z.array(
    z.object({
      requirement_ids: z.array(z.string()).min(1),
      category: z.string(),
      prompt: z.string().min(1),
      answer_outline: z.string(),
      difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    })
  ),
}));

/** Appendix A question categories — generated with separate prompts / calls. */
export type QuestionCategory =
  | "technical"
  | "behavioural"
  | "system-design"
  | "company-fit";

export interface QuestionResearchContext {
  hiring_info_found?: boolean;
  hiring_notes?: string[];
  interview_excerpts?: Array<{ url: string; text: string }>;
  interview_notes?: string[];
  pages_used?: string[];
}

export interface GeneratedQuestion {
  id: string;
  requirement_ids: string[];
  category: string;
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
  state: "generated";
  pinned: boolean;
}

const CATEGORY_PROMPTS: Record<QuestionCategory, string> = {
  technical: [
    "Focus ONLY on technical depth: coding, debugging, APIs, data structures, testing, tooling, and production incidents.",
    "Do not write behavioural or culture-fit questions in this call.",
    'Set every question category field to "technical".',
  ].join(" "),
  behavioural: [
    "Focus ONLY on behavioural / soft-skill questions (collaboration, conflict, mentoring, ownership, communication).",
    "Prefer STAR-style prompts. Do not write coding or system-design questions in this call.",
    'Set every question category field to "behavioural".',
  ].join(" "),
  "system-design": [
    "Focus ONLY on system design / architecture: scalability, trade-offs, data models, reliability, APIs at scale.",
    "Do not write behavioural culture questions or narrow coding trivia in this call.",
    'Set every question category field to "system-design".',
  ].join(" "),
  "company-fit": [
    "Focus ONLY on company-fit / motivation / process awareness for THIS employer.",
    "Use hiring-process and public-discussion notes when present (e.g. take-home, panel, values).",
    "If research is thin, ask honest company-research questions rather than inventing facts.",
    'Set every question category field to "company-fit".',
  ].join(" "),
};

function detectHiringSignals(research?: QuestionResearchContext): {
  mentionsTakeHome: boolean;
  mentionsSystemDesign: boolean;
  mentionsBehavioural: boolean;
  processSummary: string;
} {
  const blob = [
    ...(research?.hiring_notes || []),
    ...(research?.interview_notes || []),
    ...(research?.interview_excerpts || []).map((e) => e.text),
  ]
    .join(" ")
    .toLowerCase();

  return {
    mentionsTakeHome: /\btake[- ]?home\b|\bcoding challenge\b|\bassignment\b/.test(blob),
    mentionsSystemDesign: /\bsystem design\b|\barchitecture\b|\bdesign round\b/.test(blob),
    mentionsBehavioural: /\bbehavio?ural\b|\bculture fit\b|\bvalues interview\b|\bstar\b/.test(blob),
    processSummary: blob.slice(0, 1200) || "No public hiring-process detail found.",
  };
}

/**
 * Map requirements into category buckets. Technical and behavioural never share a call.
 * System-design / company-fit get their own calls when research or seniority warrants them.
 */
export function planQuestionCategories(
  requirements: Requirement[],
  research?: QuestionResearchContext,
  options?: { onlyCategory?: string; forceSystemDesign?: boolean }
): Array<{ category: QuestionCategory; requirements: Requirement[] }> {
  const only = options?.onlyCategory?.toLowerCase().trim();
  const signals = detectHiringSignals(research);

  const technical = requirements.filter(
    (r) => r.kind === "technical" || r.kind === "experience" || r.kind === "domain"
  );
  const behavioural = requirements.filter((r) => r.kind === "behavioural");
  const other = requirements.filter((r) => r.kind === "other");

  const techPool =
    technical.length > 0 ? [...technical, ...other] : requirements.length ? requirements : [];
  const behavPool =
    behavioural.length > 0
      ? behavioural
      : other.length
        ? other
        : requirements.filter((r) => r.priority === "must").slice(0, 2);

  const plan: Array<{ category: QuestionCategory; requirements: Requirement[] }> = [];

  const want = (cat: QuestionCategory) => !only || only === cat;

  if (want("technical") && techPool.length) {
    plan.push({ category: "technical", requirements: techPool });
  }
  if (want("behavioural") && (behavPool.length || requirements.some((r) => r.kind === "behavioural"))) {
    plan.push({
      category: "behavioural",
      requirements: behavPool.length ? behavPool : requirements.slice(0, 1),
    });
  }

  const shouldSystemDesign =
    options?.forceSystemDesign ||
    signals.mentionsSystemDesign ||
    techPool.some((r) => r.priority === "must") ||
    /senior|staff|principal|architect/i.test(techPool.map((r) => r.text).join(" "));

  if (want("system-design") && shouldSystemDesign && techPool.length) {
    plan.push({ category: "system-design", requirements: techPool });
  }

  if (want("company-fit")) {
    // Always run a dedicated company-fit pass so hiring research can change the kit.
    plan.push({
      category: "company-fit",
      requirements: requirements.length ? requirements : [],
    });
  }

  if (only && plan.length === 0 && requirements.length) {
    const cat = (["technical", "behavioural", "system-design", "company-fit"].includes(only)
      ? only
      : "technical") as QuestionCategory;
    plan.push({ category: cat, requirements });
  }

  return plan;
}

export class QuestionGenerator {
  constructor(private readonly llm: LLMProvider) {}

  async generateForRequirements(
    requirements: Requirement[],
    context: {
      role: string;
      company: string;
      mode: "initial" | "gap" | "category";
      targetCount?: number;
      days?: number;
      research?: QuestionResearchContext;
      /** When set, only regenerate this category (separate call + instructions). */
      onlyCategory?: string;
    }
  ): Promise<GeneratedQuestion[]> {
    if (requirements.length === 0 && context.mode !== "category") return [];

    const targetCount =
      context.targetCount ??
      (context.mode === "gap"
        ? Math.max(requirements.length, 1)
        : Math.max(requirements.length, context.days ?? requirements.length));

    const plan = planQuestionCategories(requirements, context.research, {
      onlyCategory: context.onlyCategory,
      forceSystemDesign: context.mode === "category" && context.onlyCategory === "system-design",
    });

    if (plan.length === 0) return [];

    const signals = detectHiringSignals(context.research);
    const activeCategories = plan.map((p) => p.category);
    // Split target across planned category calls (company-fit gets a smaller share).
    const weights = plan.map((p) => (p.category === "company-fit" ? 1 : p.category === "system-design" ? 1.2 : 1.5));
    const weightSum = weights.reduce((a, b) => a + b, 0) || 1;

    const collected: GeneratedQuestion[] = [];

    for (let i = 0; i < plan.length; i++) {
      const { category, requirements: bucket } = plan[i];
      if (category !== "company-fit" && bucket.length === 0) continue;

      const share = Math.max(
        category === "company-fit" ? 1 : bucket.length,
        Math.round((targetCount * weights[i]) / weightSum)
      );
      const batchTarget =
        context.mode === "gap"
          ? Math.max(bucket.length, 1)
          : Math.min(share, Math.max(bucket.length * 3, share));

      const generated = await this.generateCategoryBatch({
        category,
        requirements: bucket.length ? bucket : requirements,
        targetCount: batchTarget,
        role: context.role,
        company: context.company,
        days: context.days,
        mode: context.mode === "gap" ? "gap" : "initial",
        research: context.research,
        hiringSignals: signals,
        alreadyHave: collected.map((q) => q.prompt),
      });
      collected.push(...generated);
    }

    // Gap mode may still miss ids if a category call filtered poorly — one focused top-up per uncovered req.
    if (context.mode === "gap" && requirements.length) {
      const covered = new Set(collected.flatMap((q) => q.requirement_ids));
      const still = requirements.filter((r) => !covered.has(r.id));
      for (const req of still) {
        const cat: QuestionCategory =
          req.kind === "behavioural"
            ? "behavioural"
            : req.kind === "domain"
              ? "company-fit"
              : "technical";
        const extra = await this.generateCategoryBatch({
          category: cat,
          requirements: [req],
          targetCount: 1,
          role: context.role,
          company: context.company,
          days: context.days,
          mode: "gap",
          research: context.research,
          hiringSignals: signals,
          alreadyHave: collected.map((q) => q.prompt),
        });
        collected.push(...extra);
      }
    }

    // Volume top-up stays within one category so instructions stay pure.
    if (
      (context.mode === "initial" || context.mode === "category") &&
      collected.length < targetCount &&
      requirements.length > 0 &&
      activeCategories.length
    ) {
      const need = targetCount - collected.length;
      const cat = (activeCategories.find((c) => c === "technical") ||
        activeCategories[0]) as QuestionCategory;
      const mustFirst = [
        ...requirements.filter((r) => r.priority === "must"),
        ...requirements.filter((r) => r.priority !== "must"),
      ];
      const topUp = await this.generateCategoryBatch({
        category: cat,
        requirements: mustFirst.slice(0, Math.min(mustFirst.length, need)),
        targetCount: need,
        role: context.role,
        company: context.company,
        days: context.days,
        mode: "initial",
        research: context.research,
        hiringSignals: signals,
        alreadyHave: collected.map((q) => q.prompt),
      });
      collected.push(...topUp.slice(0, need));
    }

    return collected;
  }

  private async generateCategoryBatch(input: {
    category: QuestionCategory;
    requirements: Requirement[];
    targetCount: number;
    role: string;
    company: string;
    days?: number;
    mode: "initial" | "gap";
    research?: QuestionResearchContext;
    hiringSignals: ReturnType<typeof detectHiringSignals>;
    alreadyHave: string[];
  }): Promise<GeneratedQuestion[]> {
    const { category, requirements, targetCount, hiringSignals } = input;
    const allowed = new Set(requirements.map((r) => r.id));

    const hiringBlock = [
      `hiring_info_found: ${Boolean(input.research?.hiring_info_found)}`,
      `process_signals: take_home=${hiringSignals.mentionsTakeHome}; system_design=${hiringSignals.mentionsSystemDesign}; behavioural=${hiringSignals.mentionsBehavioural}`,
      `hiring_notes: ${(input.research?.hiring_notes || []).slice(0, 8).join(" | ") || "none"}`,
      `interview_notes: ${(input.research?.interview_notes || []).slice(0, 5).join(" | ") || "none"}`,
      `interview_excerpts: ${JSON.stringify((input.research?.interview_excerpts || []).slice(0, 4))}`,
      `process_summary: ${hiringSignals.processSummary}`,
    ].join("\n");

    const result = await this.llm.generateStructured(questionsSchemaStrict, {
      system: [
        modeLabel(input.mode, category),
        `This call generates ONLY "${category}" interview questions.`,
        CATEGORY_PROMPTS[category],
        "Every question must include requirement_ids from the provided list (company-fit may link multiple).",
        `Generate about ${targetCount} questions (at least one when requirements are present).`,
        "Must-have requirements should get more/deeper questions than nice-to-haves.",
        "Adapt to hiring-process research: e.g. take-home → prep for assignment discussion; published system-design round → deeper architecture prompts.",
        "Do not invent requirements or company facts. If research is empty, say so in outlines rather than fabricating.",
        'Return JSON: { "questions": [{ "requirement_ids": ["r1"], "category": "' +
          category +
          '", "prompt": "...", "answer_outline": "...", "difficulty": 1|2|3 }] }',
      ].join(" "),
      user: [
        JSON.stringify({
          role: input.role,
          company: input.company,
          days_available: input.days,
          target_question_count: targetCount,
          category,
          requirements,
          already_have_prompts: input.alreadyHave.slice(0, 25),
        }),
        wrapUntrustedContent("HIRING_AND_INTERVIEW_RESEARCH", truncate(hiringBlock, 6000)),
      ].join("\n\n"),
    });

    const out: GeneratedQuestion[] = [];
    for (const q of result.questions) {
      let ids = q.requirement_ids.filter((id) => allowed.has(id));
      if (!ids.length && requirements[0]) ids = [requirements[0].id];
      if (!ids.length || !q.prompt.trim()) continue;
      out.push({
        id: `q_${uuid().slice(0, 8)}`,
        requirement_ids: ids,
        category, // force category purity — model must not mix buckets
        prompt: q.prompt,
        answer_outline: q.answer_outline,
        difficulty: q.difficulty,
        state: "generated",
        pinned: false,
      });
    }
    return out;
  }
}

function modeLabel(mode: "initial" | "gap", category: QuestionCategory): string {
  if (mode === "gap") {
    return `Task label: "gap uncovered ${category} interview questions".`;
  }
  return `Task label: "${category} interview questions".`;
}

const flashcardsSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;
  const list = obj.flashcards ?? obj.cards ?? obj.items;
  if (!Array.isArray(list)) return { flashcards: [] };
  return {
    flashcards: list.map((item) => {
      if (!item || typeof item !== "object") return item;
      const f = item as Record<string, unknown>;
      const requirement_ids = Array.isArray(f.requirement_ids)
        ? f.requirement_ids.map(String)
        : f.requirement_id
          ? [String(f.requirement_id)]
          : [];
      return {
        front: asString(f.front ?? f.question ?? f.prompt),
        back: asString(f.back ?? f.answer ?? f.response),
        requirement_ids,
      };
    }),
  };
}, z.object({
  flashcards: z.array(
    z.object({
      front: z.string().min(1),
      back: z.string().min(1),
      requirement_ids: z.array(z.string()).min(1),
    })
  ),
}));

export class FlashcardGenerator {
  constructor(private readonly llm: LLMProvider) {}

  async generate(
    requirements: Requirement[],
    questions: { prompt: string; requirement_ids: string[] }[],
    options: { targetCount?: number } = {}
  ) {
    if (requirements.length === 0) return [];

    const targetCount = options.targetCount ?? Math.max(requirements.length, 6);

    const result = await this.llm.generateStructured(flashcardsSchema, {
      system: [
        'Task label: "flashcards".',
        "Create concise study flashcards tied to requirement IDs.",
        `Generate about ${targetCount} flashcards (at least one per requirement when possible).`,
        "Do not invent requirements.",
        'Return JSON: { "flashcards": [{ "front": "...", "back": "...", "requirement_ids": ["r1"] }] }',
      ].join(" "),
      user: JSON.stringify({
        target_flashcard_count: targetCount,
        requirements,
        sample_questions: questions.slice(0, 30),
      }),
    });

    const allowed = new Set(requirements.map((r) => r.id));
    return result.flashcards
      .map((f) => ({
        id: `f_${uuid().slice(0, 8)}`,
        front: f.front,
        back: f.back,
        requirement_ids: f.requirement_ids.filter((id) => allowed.has(id)),
        state: "generated" as const,
        pinned: false,
      }))
      .filter((f) => f.requirement_ids.length > 0 && f.front.trim() && f.back.trim());
  }
}
