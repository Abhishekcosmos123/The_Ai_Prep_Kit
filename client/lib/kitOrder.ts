import type { Question } from "@/types/kit";

export function byId<T extends { id: string }>(items: T[]) {
  return new Map(items.map((i) => [i.id, i]));
}

/** Pinned questions stay first; relative order within each group is preserved. */
export function withPinnedFirst(questions: Question[]): Question[] {
  const pinned: Question[] = [];
  const rest: Question[] = [];
  for (const q of questions) {
    if (q.pinned) pinned.push(q);
    else rest.push(q);
  }
  return [...pinned, ...rest];
}

export function reorderList<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
