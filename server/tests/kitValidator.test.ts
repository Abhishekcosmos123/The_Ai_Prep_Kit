import { describe, expect, it } from "vitest";
import { validateKit } from "../src/engine/validation/kitValidator.js";
import type { InterviewKit } from "../src/types/kit.js";

function baseKit(overrides: Partial<InterviewKit> = {}): InterviewKit {
  const kit: InterviewKit = {
    source: {
      company: "Acme",
      company_url: "https://example.com",
      role: "Engineer",
      location: "Remote",
      jd_chars: 100,
      researched_at: new Date().toISOString(),
      pages_used: ["https://example.com"],
    },
    company_brief: {
      summary: "Acme builds tools.",
      what_they_do: "Developer platforms.",
      sources: ["https://example.com"],
    },
    role: {
      title: "Engineer",
      seniority: "mid",
      responsibilities: ["Build"],
      requirements: [
        { id: "r1", text: "TypeScript", kind: "technical", priority: "must" },
        { id: "r2", text: "Communication", kind: "behavioural", priority: "nice" },
      ],
    },
    questions: [
      {
        id: "q1",
        requirement_ids: ["r1"],
        category: "technical",
        prompt: "Explain TS",
        answer_outline: "...",
        difficulty: 2,
      },
      {
        id: "q2",
        requirement_ids: ["r2"],
        category: "behavioural",
        prompt: "Conflict",
        answer_outline: "...",
        difficulty: 1,
      },
    ],
    flashcards: [
      {
        id: "f1",
        front: "What is TS?",
        back: "Typed JS",
        requirement_ids: ["r1"],
      },
    ],
    schedule: {
      days_available: 2,
      days: [
        { day: 1, focus: "technical", question_ids: ["q1"], minutes: 16 },
        { day: 2, focus: "behavioural", question_ids: ["q2"], minutes: 12 },
      ],
    },
    coverage: {
      uncovered_requirement_ids: [],
      passes: 1,
    },
  };
  return { ...kit, ...overrides };
}

describe("validateKit", () => {
  it("accepts a valid kit", () => {
    expect(validateKit(baseKit()).valid).toBe(true);
  });

  it("rejects missing summary", () => {
    const kit = baseKit();
    kit.company_brief.summary = "";
    expect(validateKit(kit).valid).toBe(false);
  });

  it("rejects duplicate question IDs", () => {
    const kit = baseKit();
    kit.questions[1].id = "q1";
    expect(validateKit(kit).valid).toBe(false);
  });

  it("rejects invalid requirement references", () => {
    const kit = baseKit();
    kit.questions[0].requirement_ids = ["nope"];
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
  });

  it("rejects invalid difficulty", () => {
    const kit = baseKit();
    // @ts-expect-error intentional
    kit.questions[0].difficulty = 9;
    expect(validateKit(kit).valid).toBe(false);
  });

  it("rejects invalid schedule reference", () => {
    const kit = baseKit();
    kit.schedule.days[0].question_ids = ["missing"];
    expect(validateKit(kit).valid).toBe(false);
  });

  it("rejects uncovered must requirements", () => {
    const kit = baseKit();
    kit.questions = [kit.questions[1]];
    kit.coverage.uncovered_requirement_ids = ["r1"];
    kit.schedule.days = [
      { day: 1, focus: "behavioural", question_ids: ["q2"], minutes: 12 },
      { day: 2, focus: "review", question_ids: [], minutes: 20 },
    ];
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes("must-have"))).toBe(true);
  });
});
