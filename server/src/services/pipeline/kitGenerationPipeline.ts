import { env } from "../../config/env.js";
import { logger, preview } from "../../config/logger.js";
import {
  checkCoverage,
  uncoveredMustRequirements,
} from "../../engine/coverage/coverageChecker.js";
import { allocateSchedule, targetFlashcardCount, targetQuestionCount } from "../../engine/scheduling/scheduleAllocator.js";
import { validateKit } from "../../engine/validation/kitValidator.js";
import type { GenerateKitInput, InterviewKit } from "../../types/kit.js";
import type { PipelineResult, ProgressCallback } from "../../types/generation.js";
import { AppError } from "../../utils/errors.js";
import { localUrlsAllowed, validateExternalUrl } from "../../utils/urlValidator.js";
import { ResearchService } from "../research/researchService.js";
import {
  CompanyBriefGenerator,
  FlashcardGenerator,
  QuestionGenerator,
  RequirementExtractor,
} from "../generation/contentGenerators.js";
import { getLLMProvider, type LLMProvider } from "../generation/llmProvider.js";

const STEPS = [
  { id: "validate", label: "Validating input" },
  { id: "extract", label: "Extracting requirements" },
  { id: "research", label: "Researching company" },
  { id: "interviews", label: "Searching interviews" },
  { id: "brief", label: "Generating company brief" },
  { id: "questions", label: "Generating questions" },
  { id: "coverage", label: "Checking coverage" },
  { id: "gaps", label: "Filling gaps" },
  { id: "flashcards", label: "Generating flashcards" },
  { id: "schedule", label: "Creating schedule" },
  { id: "validate_kit", label: "Validating kit" },
] as const;

export class KitGenerationPipeline {
  constructor(
    private readonly llm: LLMProvider = getLLMProvider(),
    private readonly researchService = new ResearchService()
  ) {}

  async generate(
    input: GenerateKitInput,
    onProgress?: ProgressCallback
  ): Promise<PipelineResult> {
    const runId = input.case_id || `run_${Date.now().toString(36)}`;
    const log = logger.child({ runId, company_url: input.company_url, days: input.days });
    const startedAt = Date.now();

    const report = async (
      step: string,
      status: "pending" | "running" | "done" | "error" | "skipped",
      message?: string
    ) => {
      const index = STEPS.findIndex((s) => s.id === step);
      const label = STEPS[index]?.label || step;
      const percent = Math.round(((index + (status === "done" ? 1 : 0)) / STEPS.length) * 100);
      if (status === "running") {
        log.info(`pipeline.step.start`, { step, label, percent });
      } else if (status === "done") {
        log.info(`pipeline.step.done`, { step, label, percent, message });
      } else if (status === "error") {
        log.error(`pipeline.step.error`, { step, label, percent, message });
      } else {
        log.debug(`pipeline.step.${status}`, { step, label, percent, message });
      }
      await onProgress?.({ step, label, status, message, percent });
    };

    try {
      log.info("pipeline.start", {
        jd_chars: input.jd?.length ?? 0,
        jd_preview: preview(input.jd, 120),
      });

      await report("validate", "running");
      const jd = input.jd?.trim() || "";
      if (!jd) throw new AppError("INVALID_JD", "Job description is required.");
      if (jd.length > env.MAX_JD_CHARS) {
        throw new AppError("JD_TOO_LONG", `Job description exceeds ${env.MAX_JD_CHARS} characters.`);
      }
      const days = Number(input.days);
      if (!Number.isInteger(days) || days < 1 || days > 60) {
        throw new AppError("INVALID_DAYS", "Days available must be an integer between 1 and 60.");
      }
      const allowLocal = localUrlsAllowed();
      const companyUrl = (
        await validateExternalUrl(input.company_url, {
          allowPrivate: allowLocal,
          allowLocalhost: allowLocal,
        })
      ).toString();
      log.debug("pipeline.validate.ok", { companyUrl, allowLocal });
      await report("validate", "done");

      await report("extract", "running");
      const extractor = new RequirementExtractor(this.llm);
      const extracted = await extractor.extract(jd);
      log.info("pipeline.extract.summary", {
        company: extracted.company,
        role: extracted.role,
        requirement_count: extracted.requirements.length,
        must_count: extracted.requirements.filter((r) => r.priority === "must").length,
        nice_count: extracted.requirements.filter((r) => r.priority === "nice").length,
        requirement_ids: extracted.requirements.map((r) => r.id),
      });
      await report("extract", "done", `${extracted.requirements.length} requirements`);

      await report("research", "running");
      const research = await this.researchService.researchCompany(companyUrl);
      if (research.unreachable && research.pages.length === 0) {
        log.warn("pipeline.research.unreachable_continue", {
          notes: research.notes.slice(0, 5),
        });
      } else {
        log.info("pipeline.research.summary", {
          pages_used: research.pages_used.length,
          hiring_info_found: research.hiring_info_found,
          unreachable: research.unreachable,
          notes: research.notes.slice(0, 5),
        });
      }
      await report(
        "research",
        "done",
        research.unreachable
          ? "Company site limited/unreachable; continuing"
          : `${research.pages_used.length} pages`
      );

      await report("interviews", "running");
      const discussions = await this.researchService.researchInterviews(
        extracted.company || research.company_name,
        extracted.role
      );
      log.info("pipeline.interviews.summary", {
        sources: discussions.sources.length,
        notes: discussions.notes.slice(0, 3),
      });
      await report(
        "interviews",
        "done",
        discussions.sources.length
          ? `${discussions.sources.length} sources`
          : "No public discussions found"
      );

      await report("brief", "running");
      const briefGen = new CompanyBriefGenerator(this.llm);
      const company_brief = await briefGen.generate({
        companyName: extracted.company || research.company_name,
        pages: research.pages.map((p) => ({ url: p.url, text: p.text })),
        notes: [...research.notes, ...discussions.notes],
      });
      company_brief.sources = [
        ...new Set([...company_brief.sources, ...research.pages_used, ...discussions.sources]),
      ];
      log.info("pipeline.brief.summary", {
        summary_preview: preview(company_brief.summary, 160),
        sources: company_brief.sources.length,
      });
      await report("brief", "done");

      await report("questions", "running");
      const questionGen = new QuestionGenerator(this.llm);
      const questionTarget = targetQuestionCount(extracted.requirements, days);
      const researchContext = {
        hiring_info_found: research.hiring_info_found,
        hiring_notes: research.notes,
        interview_excerpts: discussions.excerpts,
        interview_notes: discussions.notes,
        pages_used: research.pages_used,
      };
      log.info("pipeline.questions.target", {
        target: questionTarget,
        days,
        hiring_info_found: research.hiring_info_found,
        interview_sources: discussions.sources.length,
      });
      let questions = await questionGen.generateForRequirements(extracted.requirements, {
        role: extracted.role,
        company: extracted.company || research.company_name,
        mode: "initial",
        targetCount: questionTarget,
        days,
        research: researchContext,
      });
      const byCategory = questions.reduce<Record<string, number>>((acc, q) => {
        acc[q.category] = (acc[q.category] || 0) + 1;
        return acc;
      }, {});
      log.info("pipeline.questions.initial", {
        count: questions.length,
        target: questionTarget,
        by_category: byCategory,
      });
      await report(
        "questions",
        "done",
        `${questions.length} questions across ${Object.keys(byCategory).length} categories`
      );

      let passes = 1;
      await report("coverage", "running");
      let coverage = checkCoverage(extracted.requirements, questions);
      log.info("pipeline.coverage.pass", {
        pass: passes,
        covered: coverage.covered_count,
        total: coverage.total_count,
        uncovered: coverage.uncovered_requirement_ids,
      });
      await report(
        "coverage",
        "done",
        `${coverage.covered_count}/${coverage.total_count} covered`
      );

      await report("gaps", "running");
      while (
        coverage.uncovered_requirement_ids.length > 0 &&
        passes < env.MAX_COVERAGE_PASSES
      ) {
        const uncovered = extracted.requirements.filter((r: { id: string }) =>
          coverage.uncovered_requirement_ids.includes(r.id)
        );
        log.info("pipeline.gaps.fill", {
          pass: passes + 1,
          uncovered_ids: uncovered.map((r) => r.id),
        });
        const gapQuestions = await questionGen.generateForRequirements(uncovered, {
          role: extracted.role,
          company: extracted.company || research.company_name,
          mode: "gap",
          research: researchContext,
        });
        questions = [...questions, ...gapQuestions];
        passes += 1;
        coverage = checkCoverage(extracted.requirements, questions);
        log.info("pipeline.coverage.pass", {
          pass: passes,
          covered: coverage.covered_count,
          total: coverage.total_count,
          uncovered: coverage.uncovered_requirement_ids,
          gap_questions_added: gapQuestions.length,
        });
      }
      await report(
        "gaps",
        "done",
        coverage.uncovered_requirement_ids.length
          ? `${coverage.uncovered_requirement_ids.length} still uncovered after ${passes} passes`
          : `Full coverage in ${passes} passes`
      );

      const uncoveredMust = uncoveredMustRequirements(
        extracted.requirements,
        coverage.uncovered_requirement_ids
      );
      if (uncoveredMust.length) {
        log.warn("pipeline.coverage.uncovered_must", {
          ids: uncoveredMust.map((r) => r.id),
          texts: uncoveredMust.map((r) => preview(r.text, 80)),
        });
      }

      await report("flashcards", "running");
      const flashGen = new FlashcardGenerator(this.llm);
      const flashTarget = targetFlashcardCount(extracted.requirements, days);
      const flashcards = await flashGen.generate(extracted.requirements, questions, {
        targetCount: flashTarget,
      });
      log.info("pipeline.flashcards.summary", { count: flashcards.length, target: flashTarget });
      await report("flashcards", "done", `${flashcards.length} cards`);

      await report("schedule", "running");
      const daysSchedule = allocateSchedule(extracted.requirements, questions, days);
      log.info("pipeline.schedule.summary", {
        days: daysSchedule.length,
        total_minutes: daysSchedule.reduce((sum, d) => sum + d.minutes, 0),
        day_focuses: daysSchedule.map((d) => ({ day: d.day, focus: d.focus, q: d.question_ids.length })),
      });
      await report("schedule", "done");

      const kit: InterviewKit = {
        source: {
          company: extracted.company || research.company_name,
          company_url: companyUrl,
          role: extracted.role,
          location: extracted.location,
          jd_chars: jd.length,
          researched_at: new Date().toISOString(),
          pages_used: research.pages_used,
        },
        company_brief,
        role: {
          title: extracted.role,
          seniority: extracted.seniority,
          responsibilities: extracted.responsibilities,
          requirements: extracted.requirements,
        },
        questions,
        flashcards,
        schedule: {
          days_available: days,
          days: daysSchedule,
        },
        coverage: {
          uncovered_requirement_ids: coverage.uncovered_requirement_ids,
          passes,
        },
      };

      await report("validate_kit", "running");
      const validation = validateKit(kit, {
        allowUncoveredMust: false,
      });

      if (!validation.valid) {
        const onlyMust =
          uncoveredMust.length > 0 &&
          validation.issues.every(
            (i) => i.path === "coverage" || i.message.includes("must-have")
          );

        if (onlyMust) {
          await report("validate_kit", "error", "Uncovered must-have requirements");
          log.warn("pipeline.incomplete", {
            elapsed_ms: Date.now() - startedAt,
            issues: validation.issues.slice(0, 10),
            uncovered_must: uncoveredMust.map((r) => r.id),
          });
          return {
            status: "incomplete",
            kit,
            error: {
              code: "UNCOVERED_MUST_REQUIREMENTS",
              message: `Must-have requirements remain uncovered after ${passes} passes: ${uncoveredMust
                .map((r) => r.id)
                .join(", ")}`,
            },
          };
        }

        await report("validate_kit", "error", validation.issues[0]?.message);
        log.error("pipeline.validation_failed", {
          elapsed_ms: Date.now() - startedAt,
          issues: validation.issues.slice(0, 15),
        });
        return {
          status: "failed",
          kit: null,
          error: {
            code: "KIT_VALIDATION_FAILED",
            message: validation.issues.map((i) => i.message).join("; "),
          },
        };
      }

      await report("validate_kit", "done");
      log.info("pipeline.ok", {
        elapsed_ms: Date.now() - startedAt,
        questions: questions.length,
        flashcards: flashcards.length,
        requirements: extracted.requirements.length,
        passes,
        coverage_ratio: coverage.coverage_ratio,
      });
      return { status: "ok", kit, error: null };
    } catch (error) {
      const code =
        error instanceof AppError
          ? error.code
          : error instanceof Error && /unreachable|fetch|ENOTFOUND|timeout/i.test(error.message)
            ? "COMPANY_UNREACHABLE"
            : "GENERATION_FAILED";
      const message = error instanceof Error ? error.message : "Generation failed";
      log.error("pipeline.failed", {
        code,
        message: preview(message, 500),
        elapsed_ms: Date.now() - startedAt,
        stack: error instanceof Error ? preview(error.stack, 600) : undefined,
      });
      return { status: "failed", kit: null, error: { code, message } };
    }
  }
}

export function createPipeline(llm?: LLMProvider): KitGenerationPipeline {
  return new KitGenerationPipeline(llm ?? getLLMProvider());
}
