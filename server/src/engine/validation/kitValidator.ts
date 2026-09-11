import type { InterviewKit, Question, Flashcard, Requirement } from "../../types/kit.js";
import { checkCoverage, uncoveredMustRequirements } from "../coverage/coverageChecker.js";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

function uniqueIds(ids: string[]): boolean {
  return new Set(ids).size === ids.length;
}

export function validateKit(kit: InterviewKit, options?: { allowUncoveredMust?: boolean }): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!kit.source?.company_url) issues.push({ path: "source.company_url", message: "Missing company URL" });
  if (!kit.company_brief?.summary) issues.push({ path: "company_brief.summary", message: "Missing summary" });
  if (!kit.role?.title) issues.push({ path: "role.title", message: "Missing role title" });
  if (!Array.isArray(kit.role?.requirements)) {
    issues.push({ path: "role.requirements", message: "Requirements must be an array" });
  }
  if (!Array.isArray(kit.questions)) issues.push({ path: "questions", message: "Questions must be an array" });
  if (!Array.isArray(kit.flashcards)) issues.push({ path: "flashcards", message: "Flashcards must be an array" });
  if (!kit.schedule || !Array.isArray(kit.schedule.days)) {
    issues.push({ path: "schedule.days", message: "Schedule days must be an array" });
  }

  if (issues.length) return { valid: false, issues };

  const requirements = kit.role.requirements;
  const reqIds = requirements.map((r) => r.id);
  if (!uniqueIds(reqIds)) issues.push({ path: "role.requirements", message: "Duplicate requirement IDs" });

  for (const r of requirements) {
    if (!["technical", "behavioural", "behavioral", "domain", "experience", "other"].includes(r.kind)) {
      issues.push({ path: `requirement.${r.id}.kind`, message: "Invalid kind" });
    }
    if (!["must", "nice"].includes(r.priority)) {
      issues.push({ path: `requirement.${r.id}.priority`, message: "Invalid priority" });
    }
  }

  const qIds = kit.questions.map((q) => q.id);
  if (!uniqueIds(qIds)) issues.push({ path: "questions", message: "Duplicate question IDs" });

  const reqSet = new Set(reqIds);
  for (const q of kit.questions) {
    if (![1, 2, 3].includes(q.difficulty)) {
      issues.push({ path: `question.${q.id}.difficulty`, message: "Difficulty must be 1–3" });
    }
    for (const rid of q.requirement_ids) {
      if (!reqSet.has(rid)) {
        issues.push({
          path: `question.${q.id}.requirement_ids`,
          message: `Unknown requirement id ${rid}`,
        });
      }
    }
  }

  const fIds = kit.flashcards.map((f) => f.id);
  if (!uniqueIds(fIds)) issues.push({ path: "flashcards", message: "Duplicate flashcard IDs" });
  for (const f of kit.flashcards) {
    for (const rid of f.requirement_ids) {
      if (!reqSet.has(rid)) {
        issues.push({
          path: `flashcard.${f.id}.requirement_ids`,
          message: `Unknown requirement id ${rid}`,
        });
      }
    }
  }

  if (kit.schedule.days_available !== kit.schedule.days.length) {
    issues.push({
      path: "schedule.days_available",
      message: "days_available must match number of days",
    });
  }

  const qSet = new Set(qIds);
  for (let i = 0; i < kit.schedule.days.length; i++) {
    const day = kit.schedule.days[i];
    if (day.day !== i + 1) {
      issues.push({ path: `schedule.days[${i}].day`, message: "Day numbers must be sequential from 1" });
    }
    if (!Number.isInteger(day.minutes)) {
      issues.push({ path: `schedule.days[${i}].minutes`, message: "Minutes must be an integer" });
    }
    for (const qid of day.question_ids) {
      if (!qSet.has(qid)) {
        issues.push({
          path: `schedule.days[${i}].question_ids`,
          message: `Unknown question id ${qid}`,
        });
      }
    }
  }

  const coverage = checkCoverage(requirements, kit.questions);
  const expectedUncovered = [...coverage.uncovered_requirement_ids].sort();
  const actualUncovered = [...(kit.coverage?.uncovered_requirement_ids ?? [])].sort();
  if (JSON.stringify(expectedUncovered) !== JSON.stringify(actualUncovered)) {
    issues.push({
      path: "coverage.uncovered_requirement_ids",
      message: "Coverage array does not match deterministic checker",
    });
  }

  if (!options?.allowUncoveredMust) {
    const uncoveredMust = uncoveredMustRequirements(
      requirements,
      coverage.uncovered_requirement_ids
    );
    if (uncoveredMust.length > 0) {
      issues.push({
        path: "coverage",
        message: `Uncovered must-have requirements: ${uncoveredMust.map((r) => r.id).join(", ")}`,
      });
    }
  }

  return { valid: issues.length === 0, issues };
}

export function assertQuestionsReferenceRequirements(
  questions: Question[],
  requirements: Requirement[]
): ValidationIssue[] {
  const reqSet = new Set(requirements.map((r) => r.id));
  const issues: ValidationIssue[] = [];
  for (const q of questions) {
    for (const rid of q.requirement_ids) {
      if (!reqSet.has(rid)) {
        issues.push({ path: q.id, message: `Invalid requirement ${rid}` });
      }
    }
  }
  return issues;
}

export function assertFlashcardsReferenceRequirements(
  flashcards: Flashcard[],
  requirements: Requirement[]
): ValidationIssue[] {
  const reqSet = new Set(requirements.map((r) => r.id));
  const issues: ValidationIssue[] = [];
  for (const f of flashcards) {
    for (const rid of f.requirement_ids) {
      if (!reqSet.has(rid)) {
        issues.push({ path: f.id, message: `Invalid requirement ${rid}` });
      }
    }
  }
  return issues;
}
