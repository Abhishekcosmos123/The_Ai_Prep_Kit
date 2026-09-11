import { describe, expect, it } from "vitest";
import { checkCoverage } from "../src/engine/coverage/coverageChecker.js";
import type { Question, Requirement } from "../src/types/kit.js";

const requirements: Requirement[] = [
  { id: "r1", text: "TypeScript", kind: "technical", priority: "must" },
  { id: "r2", text: "REST", kind: "technical", priority: "must" },
  { id: "r3", text: "Teamwork", kind: "behavioural", priority: "nice" },
];

describe("checkCoverage", () => {
  it("reports all requirements covered", () => {
    const questions: Question[] = [
      {
        id: "q1",
        requirement_ids: ["r1", "r2"],
        category: "technical",
        prompt: "a",
        answer_outline: "b",
        difficulty: 2,
      },
      {
        id: "q2",
        requirement_ids: ["r3"],
        category: "behavioural",
        prompt: "c",
        answer_outline: "d",
        difficulty: 1,
      },
    ];
    const result = checkCoverage(requirements, questions);
    expect(result.uncovered_requirement_ids).toEqual([]);
    expect(result.covered_count).toBe(3);
    expect(result.coverage_ratio).toBe(1);
  });

  it("reports one uncovered requirement", () => {
    const questions: Question[] = [
      {
        id: "q1",
        requirement_ids: ["r1"],
        category: "technical",
        prompt: "a",
        answer_outline: "b",
        difficulty: 1,
      },
      {
        id: "q2",
        requirement_ids: ["r2"],
        category: "technical",
        prompt: "c",
        answer_outline: "d",
        difficulty: 2,
      },
    ];
    const result = checkCoverage(requirements, questions);
    expect(result.uncovered_requirement_ids).toEqual(["r3"]);
  });

  it("reports multiple uncovered requirements", () => {
    const questions: Question[] = [
      {
        id: "q1",
        requirement_ids: ["r1"],
        category: "technical",
        prompt: "a",
        answer_outline: "b",
        difficulty: 1,
      },
    ];
    const result = checkCoverage(requirements, questions);
    expect(result.uncovered_requirement_ids).toEqual(["r2", "r3"]);
  });

  it("ignores invalid requirement IDs on questions for coverage of real requirements", () => {
    const questions: Question[] = [
      {
        id: "q1",
        requirement_ids: ["r1", "does-not-exist"],
        category: "technical",
        prompt: "a",
        answer_outline: "b",
        difficulty: 1,
      },
    ];
    const result = checkCoverage(requirements, questions);
    expect(result.covered_requirement_ids).toEqual(["r1"]);
    expect(result.uncovered_requirement_ids).toEqual(["r2", "r3"]);
  });
});
