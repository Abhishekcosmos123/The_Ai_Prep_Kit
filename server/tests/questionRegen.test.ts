import { describe, expect, it } from "vitest";
import type { Question, ScheduleDay } from "../src/types/kit.js";
import {
  isProtectedQuestion,
  mergeQuestionsForRegen,
  reconcileScheduleQuestionIds,
} from "../src/engine/regen/questionRegen.js";

function q(
  partial: Partial<Question> & Pick<Question, "id" | "category" | "prompt">
): Question {
  return {
    requirement_ids: ["r1"],
    answer_outline: "outline",
    difficulty: 2,
    state: "generated",
    pinned: false,
    ...partial,
  };
}

describe("isProtectedQuestion", () => {
  it("protects pinned, edited, and user questions", () => {
    expect(isProtectedQuestion(q({ id: "a", category: "technical", prompt: "p", pinned: true }))).toBe(
      true
    );
    expect(
      isProtectedQuestion(q({ id: "b", category: "technical", prompt: "p", state: "edited" }))
    ).toBe(true);
    expect(
      isProtectedQuestion(q({ id: "c", category: "technical", prompt: "p", state: "user" }))
    ).toBe(true);
    expect(
      isProtectedQuestion(q({ id: "d", category: "technical", prompt: "p", state: "generated" }))
    ).toBe(false);
  });
});

describe("mergeQuestionsForRegen", () => {
  const existing = [
    q({ id: "g1", category: "technical", prompt: "gen tech", state: "generated" }),
    q({ id: "e1", category: "technical", prompt: "edited tech", state: "edited" }),
    q({ id: "u1", category: "behavioural", prompt: "user beh", state: "user" }),
    q({ id: "p1", category: "technical", prompt: "pinned gen", state: "generated", pinned: true }),
    q({ id: "g2", category: "behavioural", prompt: "gen beh", state: "generated" }),
  ];

  it("full regen keeps only protected questions and appends new ones", () => {
    const generated = [
      q({ id: "n1", category: "technical", prompt: "new tech" }),
      q({ id: "n2", category: "behavioural", prompt: "new beh" }),
    ];
    const merged = mergeQuestionsForRegen(existing, generated);
    const ids = merged.map((x) => x.id);
    expect(ids).toEqual(["e1", "u1", "p1", "n1", "n2"]);
    expect(ids).not.toContain("g1");
    expect(ids).not.toContain("g2");
  });

  it("category regen replaces only unprotected questions in that category", () => {
    const generated = [
      q({ id: "n1", category: "technical", prompt: "new tech A" }),
      q({ id: "n2", category: "technical", prompt: "new tech B" }),
      q({ id: "n3", category: "behavioural", prompt: "should drop — wrong cat" }),
    ];
    const merged = mergeQuestionsForRegen(existing, generated, "technical");
    const ids = merged.map((x) => x.id);
    // kept: edited tech, user beh, pinned tech, gen beh (other category)
    // replaced: g1
    // added: n1, n2 (not n3)
    expect(ids).toContain("e1");
    expect(ids).toContain("u1");
    expect(ids).toContain("p1");
    expect(ids).toContain("g2");
    expect(ids).toContain("n1");
    expect(ids).toContain("n2");
    expect(ids).not.toContain("g1");
    expect(ids).not.toContain("n3");
  });

  it("does not duplicate protected ids if the model reuses them", () => {
    const generated = [q({ id: "e1", category: "technical", prompt: "model collision" })];
    const merged = mergeQuestionsForRegen(existing, generated, "technical");
    expect(merged.filter((x) => x.id === "e1")).toHaveLength(1);
    expect(merged.find((x) => x.id === "e1")?.prompt).toBe("edited tech");
  });
});

describe("reconcileScheduleQuestionIds", () => {
  it("keeps focus and minutes while refreshing question ids", () => {
    const days: ScheduleDay[] = [
      { day: 1, focus: "My custom focus", question_ids: ["old", "e1"], minutes: 45 },
      { day: 2, focus: "Day two", question_ids: ["gone"], minutes: 30 },
    ];
    const questions = [
      q({ id: "e1", category: "technical", prompt: "kept" }),
      q({ id: "n1", category: "technical", prompt: "new" }),
      q({ id: "n2", category: "behavioural", prompt: "new2" }),
    ];
    const next = reconcileScheduleQuestionIds(days, questions);
    expect(next[0].focus).toBe("My custom focus");
    expect(next[0].minutes).toBe(45);
    expect(next[1].focus).toBe("Day two");
    expect(next[1].minutes).toBe(30);
    expect(next[0].question_ids).toContain("e1");
    const allIds = next.flatMap((d) => d.question_ids);
    expect(allIds.sort()).toEqual(["e1", "n1", "n2"].sort());
    expect(allIds).not.toContain("old");
    expect(allIds).not.toContain("gone");
  });
});
