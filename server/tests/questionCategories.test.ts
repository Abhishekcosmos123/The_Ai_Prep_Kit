import { describe, expect, it } from "vitest";
import { planQuestionCategories } from "../src/services/generation/contentGenerators.js";
import type { Requirement } from "../src/types/kit.js";

const reqs: Requirement[] = [
  { id: "r1", text: "5+ years React", kind: "technical", priority: "must" },
  { id: "r2", text: "Mentoring juniors", kind: "behavioural", priority: "must" },
  { id: "r3", text: "GraphQL nice to have", kind: "technical", priority: "nice" },
];

describe("planQuestionCategories", () => {
  it("plans separate technical and behavioural buckets", () => {
    const plan = planQuestionCategories(reqs);
    const cats = plan.map((p) => p.category);
    expect(cats).toContain("technical");
    expect(cats).toContain("behavioural");
    expect(cats).toContain("company-fit");

    const tech = plan.find((p) => p.category === "technical")!;
    const behav = plan.find((p) => p.category === "behavioural")!;
    expect(tech.requirements.map((r) => r.id)).toEqual(["r1", "r3"]);
    expect(behav.requirements.map((r) => r.id)).toEqual(["r2"]);
  });

  it("forces system-design when hiring research mentions it", () => {
    const plan = planQuestionCategories(reqs, {
      hiring_info_found: true,
      hiring_notes: ["Interview loop: take-home then system design round"],
    });
    expect(plan.map((p) => p.category)).toContain("system-design");
  });

  it("can target a single category for regeneration", () => {
    const plan = planQuestionCategories(reqs, undefined, { onlyCategory: "behavioural" });
    expect(plan).toHaveLength(1);
    expect(plan[0].category).toBe("behavioural");
  });
});
