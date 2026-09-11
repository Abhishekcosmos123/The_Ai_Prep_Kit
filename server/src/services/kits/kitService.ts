import mongoose from "mongoose";
import { Kit, type KitDocument } from "../../models/Kit.js";
import type { GenerationStep, InterviewKit, PracticeConfidence } from "../../types/kit.js";
import { AppError } from "../../utils/errors.js";
import { createPipeline } from "../pipeline/kitGenerationPipeline.js";
import { checkCoverage } from "../../engine/coverage/coverageChecker.js";
import { allocateSchedule } from "../../engine/scheduling/scheduleAllocator.js";
import { validateKit } from "../../engine/validation/kitValidator.js";
import {
  CompanyBriefGenerator,
  QuestionGenerator,
} from "../generation/contentGenerators.js";
import { getLLMProvider } from "../generation/llmProvider.js";
import { ResearchService } from "../research/researchService.js";
import { v4 as uuid } from "uuid";
import { logger } from "../../config/logger.js";

const INITIAL_STEPS: GenerationStep[] = [
  { id: "validate", label: "Validating input", status: "pending" },
  { id: "extract", label: "Extracting requirements", status: "pending" },
  { id: "research", label: "Researching company", status: "pending" },
  { id: "interviews", label: "Searching interviews", status: "pending" },
  { id: "brief", label: "Generating company brief", status: "pending" },
  { id: "questions", label: "Generating questions", status: "pending" },
  { id: "coverage", label: "Checking coverage", status: "pending" },
  { id: "gaps", label: "Filling gaps", status: "pending" },
  { id: "flashcards", label: "Generating flashcards", status: "pending" },
  { id: "schedule", label: "Creating schedule", status: "pending" },
  { id: "validate_kit", label: "Validating kit", status: "pending" },
];

function assertObjectId(id: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("INVALID_ID", "Invalid kit id.", 400);
  }
}

export class KitService {
  async listForUser(userId: string) {
    const kits = await Kit.find({ createdBy: userId }).sort({ createdAt: -1 });
    return kits.map((k) => this.summary(k));
  }

  async getForUser(userId: string, kitId: string) {
    const kit = await this.findOwned(userId, kitId);
    return this.detail(kit);
  }

  async createAndGenerate(
    userId: string,
    input: { jd: string; company_url: string; days: number; force?: boolean }
  ) {
    if (!input.force) {
      const duplicate = await this.findDuplicate(userId, input.jd, input.company_url);
      if (duplicate) {
        throw new AppError(
          "DUPLICATE_KIT",
          `You already have a kit for this job description and company (${duplicate._id.toString()}). Open it, or resubmit with force=true to create another.`,
          409,
          { existing_kit_id: duplicate._id.toString() }
        );
      }
    }

    const doc = await Kit.create({
      createdBy: userId,
      input: {
        jd: input.jd,
        company_url: input.company_url,
        days: input.days,
      },
      generationStatus: "queued",
      generationProgress: INITIAL_STEPS,
      generationPercent: 0,
      kit: null,
    });

    logger.info("kit.create.queued", {
      kitId: doc._id.toString(),
      userId,
      company_url: input.company_url,
      days: input.days,
      jd_chars: input.jd.length,
      forced_duplicate: Boolean(input.force),
    });

    // Fire-and-forget background generation
    void this.runGeneration(doc._id.toString()).catch((error) => {
      logger.error("kit.generation.unhandled", {
        kitId: doc._id.toString(),
        error: error instanceof Error ? error.message : String(error),
      });
    });

    return this.detail(doc);
  }

  async createBatch(
    userId: string,
    cases: Array<{ jd: string; company_url: string; days: number }>
  ) {
    if (cases.length === 0) {
      throw new AppError("EMPTY_BATCH", "Upload at least one case.", 400);
    }
    if (cases.length > 25) {
      throw new AppError("BATCH_TOO_LARGE", "Maximum 25 cases per upload.", 400);
    }
    logger.info("kit.batch.start", { userId, count: cases.length });
    const kits = [];
    for (const input of cases) {
      kits.push(await this.createAndGenerate(userId, { ...input, force: true }));
    }
    logger.info("kit.batch.queued", {
      userId,
      kitIds: kits.map((k) => k.id),
    });
    return kits;
  }

  async runGeneration(kitId: string): Promise<void> {
    const doc = await Kit.findById(kitId);
    if (!doc) {
      logger.warn("kit.generation.missing", { kitId });
      return;
    }

    const startedAt = Date.now();
    logger.info("kit.generation.start", {
      kitId,
      userId: doc.createdBy.toString(),
      company_url: doc.input?.company_url,
      days: doc.input?.days,
    });

    doc.generationStatus = "running";
    doc.generationProgress = INITIAL_STEPS.map((s) => ({ ...s }));
    doc.generationError = undefined;
    await doc.save();

    const pipeline = createPipeline();
    const result = await pipeline.generate(
      { ...doc.input, case_id: kitId },
      async (progress) => {
      const fresh = await Kit.findById(kitId);
      if (!fresh) return;
      const steps = [...(fresh.generationProgress || [])] as GenerationStep[];
      const idx = steps.findIndex((s) => s.id === progress.step);
      if (idx >= 0) {
        steps[idx] = {
          id: progress.step,
          label: progress.label,
          status: progress.status,
          message: progress.message,
        };
        // Mark previous pending as still pending; mark earlier running as done if needed
        for (let i = 0; i < idx; i++) {
          if (steps[i].status === "pending" || steps[i].status === "running") {
            steps[i] = { ...steps[i], status: "done" };
          }
        }
      }
      fresh.generationProgress = steps;
      fresh.generationPercent = progress.percent;
      await fresh.save();
    });

    const fresh = await Kit.findById(kitId);
    if (!fresh) {
      logger.warn("kit.generation.missing_after_run", { kitId });
      return;
    }

    if (result.status === "ok" && result.kit) {
      fresh.kit = result.kit;
      fresh.generationStatus = "completed";
      fresh.generationPercent = 100;
      fresh.generationError = undefined;
      logger.info("kit.generation.completed", {
        kitId,
        elapsed_ms: Date.now() - startedAt,
        questions: result.kit.questions.length,
        coverage_uncovered: result.kit.coverage.uncovered_requirement_ids.length,
      });
    } else if (result.status === "incomplete" && result.kit) {
      fresh.kit = result.kit;
      fresh.generationStatus = "incomplete";
      fresh.generationError = result.error || undefined;
      logger.warn("kit.generation.incomplete", {
        kitId,
        elapsed_ms: Date.now() - startedAt,
        error: result.error,
      });
    } else {
      fresh.generationStatus = "failed";
      fresh.generationError = result.error || {
        code: "GENERATION_FAILED",
        message: "Unknown generation failure",
      };
      logger.error("kit.generation.failed", {
        kitId,
        elapsed_ms: Date.now() - startedAt,
        error: result.error,
      });
    }
    await fresh.save();
  }

  async updateKit(userId: string, kitId: string, patch: Partial<InterviewKit>) {
    const doc = await this.findOwned(userId, kitId);
    if (!doc.kit) {
      throw new AppError("KIT_NOT_READY", "Kit content is not available yet.", 409);
    }

    const next: InterviewKit = {
      ...doc.kit,
      ...patch,
      source: { ...doc.kit.source, ...(patch.source || {}) },
      company_brief: { ...doc.kit.company_brief, ...(patch.company_brief || {}) },
      role: {
        ...doc.kit.role,
        ...(patch.role || {}),
        requirements: patch.role?.requirements || doc.kit.role.requirements,
      },
      questions: patch.questions || doc.kit.questions,
      flashcards: patch.flashcards || doc.kit.flashcards,
      schedule: patch.schedule || doc.kit.schedule,
      coverage: patch.coverage || doc.kit.coverage,
    };

    // Recompute coverage deterministically after edits
    const coverage = checkCoverage(next.role.requirements, next.questions);
    next.coverage = {
      uncovered_requirement_ids: coverage.uncovered_requirement_ids,
      passes: next.coverage.passes,
    };

    const validation = validateKit(next, { allowUncoveredMust: true });
    if (!validation.valid) {
      throw new AppError(
        "INVALID_KIT_PATCH",
        validation.issues.map((i) => i.message).join("; "),
        400
      );
    }

    doc.kit = next;
    await doc.save();
    return this.detail(doc);
  }

  async deleteKit(userId: string, kitId: string) {
    const doc = await this.findOwned(userId, kitId);
    await doc.deleteOne();
    return { ok: true };
  }

  async regenerateCompanyBrief(userId: string, kitId: string) {
    const doc = await this.findOwned(userId, kitId);
    if (!doc.kit) throw new AppError("KIT_NOT_READY", "Kit not ready.", 409);

    const research = await new ResearchService().researchCompany(doc.input.company_url);
    const brief = await new CompanyBriefGenerator(getLLMProvider()).generate({
      companyName: doc.kit.source.company,
      pages: research.pages.map((p) => ({ url: p.url, text: p.text })),
      notes: research.notes,
    });

    doc.kit = {
      ...doc.kit,
      company_brief: brief,
      source: {
        ...doc.kit.source,
        pages_used: research.pages_used,
        researched_at: new Date().toISOString(),
      },
    };
    await doc.save();
    return this.detail(doc);
  }

  async regenerateQuestions(userId: string, kitId: string, category?: string) {
    const doc = await this.findOwned(userId, kitId);
    if (!doc.kit) throw new AppError("KIT_NOT_READY", "Kit not ready.", 409);

    const preserved = doc.kit.questions.filter(
      (q) => q.pinned || q.state === "edited" || q.state === "user"
    );
    const preservedIds = new Set(preserved.map((q) => q.id));

    const requirements = doc.kit.role.requirements;

    // If category provided, only replace generated questions in that category
    const keepOthers = category
      ? doc.kit.questions.filter(
          (q) => preservedIds.has(q.id) || q.category.toLowerCase() !== category.toLowerCase()
        )
      : preserved;

    const research = await new ResearchService().researchCompany(doc.input.company_url);
    const discussions = await new ResearchService().researchInterviews(
      doc.kit.source.company,
      doc.kit.role.title
    );
    const researchContext = {
      hiring_info_found: research.hiring_info_found,
      hiring_notes: research.notes,
      interview_excerpts: discussions.excerpts,
      interview_notes: discussions.notes,
      pages_used: research.pages_used,
    };

    const generated = await new QuestionGenerator(getLLMProvider()).generateForRequirements(
      requirements,
      {
        role: doc.kit.role.title,
        company: doc.kit.source.company,
        mode: category ? "category" : "initial",
        onlyCategory: category,
        days: doc.kit.schedule.days_available,
        research: researchContext,
      }
    );

    const filteredGenerated = category
      ? generated.filter((q) => q.category.toLowerCase() === category.toLowerCase())
      : generated;

    const questions = [...keepOthers, ...filteredGenerated.filter((q) => !preservedIds.has(q.id))];
    const coverage = checkCoverage(doc.kit.role.requirements, questions);
    const schedule = allocateSchedule(
      doc.kit.role.requirements,
      questions,
      doc.kit.schedule.days_available
    );

    doc.kit = {
      ...doc.kit,
      questions,
      schedule: { days_available: doc.kit.schedule.days_available, days: schedule },
      coverage: {
        uncovered_requirement_ids: coverage.uncovered_requirement_ids,
        passes: doc.kit.coverage.passes,
      },
    };
    await doc.save();
    return this.detail(doc);
  }

  async regenerateSchedule(userId: string, kitId: string) {
    const doc = await this.findOwned(userId, kitId);
    if (!doc.kit) throw new AppError("KIT_NOT_READY", "Kit not ready.", 409);
    const days = allocateSchedule(
      doc.kit.role.requirements,
      doc.kit.questions,
      doc.kit.schedule.days_available
    );
    doc.kit = {
      ...doc.kit,
      schedule: { days_available: doc.kit.schedule.days_available, days },
    };
    await doc.save();
    return this.detail(doc);
  }

  async getPractice(userId: string, kitId: string) {
    const doc = await this.findOwned(userId, kitId);
    if (!doc.kit) throw new AppError("KIT_NOT_READY", "Kit not ready.", 409);
    const confidences = doc.practice?.confidences || [];
    const ordered = this.orderFlashcards(doc.kit.flashcards, confidences);
    const practicedIds = new Set(confidences.map((c) => c.flashcard_id));
    const covered = doc.kit.flashcards.filter((f) => practicedIds.has(f.id));
    const uncovered = doc.kit.flashcards.filter((f) => !practicedIds.has(f.id));
    return {
      flashcards: ordered,
      confidences,
      coverage: {
        covered_count: covered.length,
        uncovered_count: uncovered.length,
        total: doc.kit.flashcards.length,
        covered_ids: covered.map((f) => f.id),
        uncovered_ids: uncovered.map((f) => f.id),
      },
    };
  }

  async recordPractice(
    userId: string,
    kitId: string,
    input: { flashcard_id: string; confidence: 1 | 2 | 3 }
  ) {
    const doc = await this.findOwned(userId, kitId);
    if (!doc.kit) throw new AppError("KIT_NOT_READY", "Kit not ready.", 409);
    const exists = doc.kit.flashcards.some((f) => f.id === input.flashcard_id);
    if (!exists) throw new AppError("FLASHCARD_NOT_FOUND", "Flashcard not found.", 404);

    const confidences = [...(doc.practice?.confidences || [])];
    const idx = confidences.findIndex((c) => c.flashcard_id === input.flashcard_id);
    const entry: PracticeConfidence = {
      flashcard_id: input.flashcard_id,
      confidence: input.confidence,
      updated_at: new Date().toISOString(),
    };
    if (idx >= 0) confidences[idx] = entry;
    else confidences.push(entry);
    doc.practice = { confidences };
    await doc.save();
    return { confidences };
  }

  async addQuestion(
    userId: string,
    kitId: string,
    question: {
      prompt: string;
      answer_outline: string;
      category: string;
      difficulty: 1 | 2 | 3;
      requirement_ids: string[];
    }
  ) {
    const doc = await this.findOwned(userId, kitId);
    if (!doc.kit) throw new AppError("KIT_NOT_READY", "Kit not ready.", 409);
    const next = {
      id: `q_${uuid().slice(0, 8)}`,
      ...question,
      state: "user" as const,
      pinned: false,
    };
    return this.updateKit(userId, kitId, {
      questions: [...doc.kit.questions, next],
    });
  }

  private orderFlashcards(
    flashcards: InterviewKit["flashcards"],
    confidences: PracticeConfidence[]
  ) {
    const map = new Map(confidences.map((c) => [c.flashcard_id, c.confidence]));
    // Lower confidence first; unseen treated as 0; stable by id
    return [...flashcards].sort((a, b) => {
      const ca = map.get(a.id) ?? 0;
      const cb = map.get(b.id) ?? 0;
      if (ca !== cb) return ca - cb;
      return a.id.localeCompare(b.id);
    });
  }

  private async findDuplicate(userId: string, jd: string, companyUrl: string) {
    const normalizedUrl = companyUrl.trim().replace(/\/+$/, "").toLowerCase();
    const candidates = await Kit.find({ createdBy: userId }).sort({ createdAt: -1 }).limit(50);
    return (
      candidates.find((k) => {
        const url = (k.input?.company_url || "").trim().replace(/\/+$/, "").toLowerCase();
        return url === normalizedUrl && (k.input?.jd || "").trim() === jd.trim();
      }) || null
    );
  }

  private async findOwned(userId: string, kitId: string): Promise<KitDocument> {
    assertObjectId(kitId);
    const doc = await Kit.findById(kitId);
    if (!doc || doc.createdBy.toString() !== userId) {
      logger.warn("kit.access.denied_or_missing", { kitId, userId });
      throw new AppError("KIT_NOT_FOUND", "Kit not found.", 404);
    }
    return doc;
  }

  private summary(doc: KitDocument) {
    const kit = doc.kit;
    const coverageRatio =
      kit && kit.role.requirements.length
        ? (kit.role.requirements.length - kit.coverage.uncovered_requirement_ids.length) /
          kit.role.requirements.length
        : null;

    return {
      id: doc._id.toString(),
      company: kit?.source.company || "Pending",
      role: kit?.role.title || "Pending",
      generationStatus: doc.generationStatus,
      generationPercent: doc.generationPercent,
      createdAt: (doc as unknown as { createdAt: Date }).createdAt,
      updatedAt: (doc as unknown as { updatedAt: Date }).updatedAt,
      coverage: coverageRatio,
      days_available: doc.input.days,
      company_url: doc.input.company_url,
    };
  }

  private detail(doc: KitDocument) {
    return {
      ...this.summary(doc),
      input: doc.input,
      kit: doc.kit,
      generationProgress: doc.generationProgress,
      generationError: doc.generationError || null,
      practice: doc.practice || { confidences: [] },
    };
  }
}

export const kitService = new KitService();
