import { describe, expect, it } from "vitest";
import {
  allocateSchedule,
  targetFlashcardCount,
  targetQuestionCount,
} from "../src/engine/scheduling/scheduleAllocator.js";
import type { Question, Requirement } from "../src/types/kit.js";

const requirements: Requirement[] = [
  { id: "r1", text: "Must TypeScript", kind: "technical", priority: "must" },
  { id: "r2", text: "Nice docs", kind: "other", priority: "nice" },
];

const questions: Question[] = [
  {
    id: "q_hard_must",
    requirement_ids: ["r1"],
    category: "technical",
    prompt: "Hard must",
    answer_outline: "...",
    difficulty: 3,
  },
  {
    id: "q_easy_must",
    requirement_ids: ["r1"],
    category: "technical",
    prompt: "Easy must",
    answer_outline: "...",
    difficulty: 1,
  },
  {
    id: "q_nice",
    requirement_ids: ["r2"],
    category: "other",
    prompt: "Nice",
    answer_outline: "...",
    difficulty: 2,
  },
];

describe("allocateSchedule", () => {
  it("creates exactly 1 day", () => {
    const days = allocateSchedule(requirements, questions, 1);
    expect(days).toHaveLength(1);
    expect(days[0].day).toBe(1);
    expect(days[0].question_ids).toHaveLength(3);
    expect(Number.isInteger(days[0].minutes)).toBe(true);
  });

  it("creates exactly 5 days", () => {
    const days = allocateSchedule(requirements, questions, 5);
    expect(days).toHaveLength(5);
    expect(days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5]);
  });

  it("creates exactly 60 days", () => {
    const days = allocateSchedule(requirements, questions, 60);
    expect(days).toHaveLength(60);
    expect(days[59].day).toBe(60);
  });

  it("handles empty questions", () => {
    const days = allocateSchedule(requirements, [], 3);
    expect(days).toHaveLength(3);
    days.forEach((d) => {
      expect(d.question_ids).toEqual([]);
      expect(Number.isInteger(d.minutes)).toBe(true);
    });
  });

  it("orders higher priority and harder questions earlier overall", () => {
    const days = allocateSchedule(requirements, questions, 3);
    const flat = days.flatMap((d) => d.question_ids);
    expect(flat[0]).toBe("q_hard_must");
  });

  it("only references existing question ids and uses integer minutes", () => {
    const days = allocateSchedule(requirements, questions, 2);
    const ids = new Set(questions.map((q) => q.id));
    for (const day of days) {
      expect(Number.isInteger(day.minutes)).toBe(true);
      for (const qid of day.question_ids) {
        expect(ids.has(qid)).toBe(true);
      }
    }
  });

  it("fills long schedules with spaced review instead of empty days", () => {
    const days = allocateSchedule(requirements, questions, 14);
    expect(days).toHaveLength(14);
    // First 3 days get unique questions; remaining are review fills.
    expect(days[0].question_ids.length).toBeGreaterThan(0);
    expect(days[13].question_ids.length).toBeGreaterThan(0);
    expect(days[10].focus.toLowerCase()).toContain("review");
    const ids = new Set(questions.map((q) => q.id));
    for (const day of days) {
      for (const qid of day.question_ids) {
        expect(ids.has(qid)).toBe(true);
      }
    }
  });
});

describe("targetQuestionCount", () => {
  it("scales with days so a 14-day plan is not stuck at 6 questions", () => {
    const reqs: Requirement[] = [
      { id: "r1", text: "a", kind: "technical", priority: "must" },
      { id: "r2", text: "b", kind: "technical", priority: "must" },
      { id: "r3", text: "c", kind: "technical", priority: "must" },
      { id: "r4", text: "d", kind: "technical", priority: "must" },
      { id: "r5", text: "e", kind: "technical", priority: "must" },
      { id: "r6", text: "f", kind: "behavioural", priority: "nice" },
    ];
    expect(targetQuestionCount(reqs, 14)).toBe(14);
    expect(targetQuestionCount(reqs, 5)).toBeGreaterThanOrEqual(11); // 5*2 + 1
    expect(targetFlashcardCount(reqs, 14)).toBeGreaterThanOrEqual(6);
  });
});
