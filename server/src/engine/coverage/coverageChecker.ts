import type { Question, Requirement } from "../../types/kit.js";

export interface CoverageResult {
  uncovered_requirement_ids: string[];
  covered_requirement_ids: string[];
  covered_count: number;
  total_count: number;
  coverage_ratio: number;
}

/**
 * Deterministic coverage: a requirement is covered iff at least one question
 * lists its id in requirement_ids. The LLM is never asked this question.
 */
export function checkCoverage(
  requirements: Requirement[],
  questions: Question[]
): CoverageResult {
  const referenced = new Set<string>();
  for (const q of questions) {
    for (const id of q.requirement_ids) {
      referenced.add(id);
    }
  }

  const covered_requirement_ids: string[] = [];
  const uncovered_requirement_ids: string[] = [];

  for (const req of requirements) {
    if (referenced.has(req.id)) {
      covered_requirement_ids.push(req.id);
    } else {
      uncovered_requirement_ids.push(req.id);
    }
  }

  const total_count = requirements.length;
  const covered_count = covered_requirement_ids.length;

  return {
    uncovered_requirement_ids,
    covered_requirement_ids,
    covered_count,
    total_count,
    coverage_ratio: total_count === 0 ? 1 : covered_count / total_count,
  };
}

export function uncoveredMustRequirements(
  requirements: Requirement[],
  uncoveredIds: string[]
): Requirement[] {
  const uncovered = new Set(uncoveredIds);
  return requirements.filter((r) => r.priority === "must" && uncovered.has(r.id));
}
