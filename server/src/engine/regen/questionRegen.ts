import type { Question, ScheduleDay } from "../../types/kit.js";

/** Questions the user owns — never replaced by regeneration. */
export function isProtectedQuestion(q: Question): boolean {
  return Boolean(q.pinned || q.state === "edited" || q.state === "user");
}

/**
 * Merge existing questions with a fresh generation pass.
 *
 * - Full regen: keep only protected questions; replace the rest.
 * - Category regen: keep protected questions (any category) plus all
 *   questions outside the target category; replace only unprotected
 *   questions in that category.
 */
export function mergeQuestionsForRegen(
  existing: Question[],
  generated: Question[],
  category?: string
): Question[] {
  const preserved = existing.filter(isProtectedQuestion);
  const preservedIds = new Set(preserved.map((q) => q.id));

  const keepOthers = category
    ? existing.filter(
        (q) =>
          preservedIds.has(q.id) ||
          q.category.toLowerCase() !== category.toLowerCase()
      )
    : preserved;

  const keepIds = new Set(keepOthers.map((q) => q.id));
  const filteredGenerated = category
    ? generated.filter((q) => q.category.toLowerCase() === category.toLowerCase())
    : generated;

  return [...keepOthers, ...filteredGenerated.filter((q) => !keepIds.has(q.id))];
}

/**
 * After questions change, keep each day's focus + minutes (user edits)
 * and only refresh question_ids so references stay valid.
 */
export function reconcileScheduleQuestionIds(
  days: ScheduleDay[],
  questions: Question[]
): ScheduleDay[] {
  if (!days.length) return days;

  const valid = new Set(questions.map((q) => q.id));
  const placed = new Set<string>();

  const next = days.map((d) => {
    const question_ids = d.question_ids.filter((id) => {
      if (!valid.has(id) || placed.has(id)) return false;
      placed.add(id);
      return true;
    });
    return {
      day: d.day,
      focus: d.focus,
      minutes: d.minutes,
      question_ids,
    };
  });

  const missing = questions.filter((q) => !placed.has(q.id));
  missing.forEach((q, i) => {
    next[i % next.length].question_ids.push(q.id);
  });

  return next;
}
