import type { Question, Requirement, ScheduleDay } from "../../types/kit.js";

const BASE_MINUTES = 12;
const DIFFICULTY_BONUS: Record<1 | 2 | 3, number> = { 1: 0, 2: 4, 3: 8 };
const REVIEW_MINUTES = 18;

function priorityScore(requirements: Requirement[], requirementIds: string[]): number {
  const byId = new Map(requirements.map((r) => [r.id, r]));
  let score = 0;
  for (const id of requirementIds) {
    const req = byId.get(id);
    if (!req) continue;
    score += req.priority === "must" ? 100 : 10;
  }
  return score;
}

function questionMinutes(q: Question): number {
  return BASE_MINUTES + DIFFICULTY_BONUS[q.difficulty];
}

function dayFocus(questions: Question[], isReview: boolean): string {
  if (questions.length === 0) return "Light review / company research";
  const counts = new Map<string, number>();
  for (const q of questions) {
    counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const top = sorted.slice(0, 2).map(([c]) => c);
  const base = top.join(" + ");
  return isReview ? `Spaced review · ${base}` : base;
}

function sortQuestions(requirements: Requirement[], questions: Question[]): Question[] {
  return [...questions].sort((a, b) => {
    const pa = priorityScore(requirements, a.requirement_ids);
    const pb = priorityScore(requirements, b.requirement_ids);
    if (pb !== pa) return pb - pa;
    if (b.difficulty !== a.difficulty) return b.difficulty - a.difficulty;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Deterministic schedule allocation.
 *
 * 1. Sort by priority DESC, difficulty DESC, id ASC
 * 2. Place each unique question once (front-loaded / round-robin)
 * 3. If days remain empty (common when days >> questions), fill with
 *    spaced review of higher-priority questions (same question ids reused)
 * 4. Minutes computed in code (never by the LLM)
 */
export function allocateSchedule(
  requirements: Requirement[],
  questions: Question[],
  daysAvailable: number
): ScheduleDay[] {
  const days = Math.max(1, Math.floor(daysAvailable));
  const buckets: Question[][] = Array.from({ length: days }, () => []);
  const reviewFlags = Array.from({ length: days }, () => false);

  const sorted = sortQuestions(requirements, questions);

  if (sorted.length === 0) {
    return Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      focus: "Light review / company research",
      question_ids: [],
      minutes: 30,
    }));
  }

  if (sorted.length >= days) {
    // Enough material: round-robin across all days.
    sorted.forEach((q, index) => {
      buckets[index % days].push(q);
    });
  } else {
    // Fewer questions than days: front-load unique questions on early days,
    // then fill remaining days with spaced review (reuse question ids).
    sorted.forEach((q, index) => {
      buckets[index].push(q);
    });

    // Prefer must-linked / harder questions for review cycles.
    const reviewPool = sorted.length > 0 ? sorted : [];
    let cursor = 0;
    for (let dayIdx = sorted.length; dayIdx < days; dayIdx++) {
      const q = reviewPool[cursor % reviewPool.length];
      buckets[dayIdx].push(q);
      reviewFlags[dayIdx] = true;
      cursor += 1;
    }
  }

  return buckets.map((qs, i) => {
    const minutes = qs.reduce((sum, q) => sum + questionMinutes(q), 0);
    const isReview = reviewFlags[i];
    return {
      day: i + 1,
      focus: dayFocus(qs, isReview),
      question_ids: qs.map((q) => q.id),
      minutes: Math.max(
        minutes,
        qs.length === 0 ? 20 : isReview ? Math.max(minutes, REVIEW_MINUTES) : minutes
      ),
    };
  });
}

/**
 * How many interview questions to aim for given requirements + prep window.
 * Keeps free-tier LLM cost bounded while filling longer schedules.
 */
export function targetQuestionCount(requirements: Requirement[], daysAvailable: number): number {
  const days = Math.max(1, Math.floor(daysAvailable));
  const must = requirements.filter((r) => r.priority === "must").length;
  const nice = requirements.filter((r) => r.priority === "nice").length;
  const byPriority = must * 2 + Math.max(nice, 0);
  // Aim for roughly one fresh question per day, with a floor from priorities.
  const byDays = days;
  const raw = Math.max(byPriority, byDays, requirements.length);
  // Cap: avoid huge generations on 60-day plans / free tiers.
  return Math.min(raw, Math.max(requirements.length, 36));
}

export function targetFlashcardCount(requirements: Requirement[], daysAvailable: number): number {
  const days = Math.max(1, Math.floor(daysAvailable));
  const raw = Math.max(requirements.length, Math.min(days, requirements.length * 2));
  return Math.min(raw, 30);
}
