import { describe, expect, it } from "vitest";
import { normalizeExtractionPayload } from "../src/services/generation/contentGenerators.js";
import { z } from "zod";

// Re-create the preprocess path used in production via exported normalizer + a local schema.
const schema = z.preprocess(
  normalizeExtractionPayload,
  z.object({
    company: z.string(),
    role: z.string(),
    location: z.string(),
    seniority: z.string(),
    responsibilities: z.array(z.string()),
    requirements: z.array(
      z.object({
        text: z.string(),
        kind: z.enum(["technical", "behavioural", "domain", "experience", "other"]),
        priority: z.enum(["must", "nice"]),
      })
    ),
  })
);

describe("normalizeExtractionPayload", () => {
  it("accepts the canonical flat shape", () => {
    const result = schema.parse({
      company: "Acme",
      role: "Engineer",
      location: "Remote",
      seniority: "mid",
      responsibilities: ["Build"],
      requirements: [{ text: "TypeScript", kind: "technical", priority: "must" }],
    });
    expect(result.requirements).toHaveLength(1);
    expect(result.company).toBe("Acme");
  });

  it("flattens requirements grouped by kind (the failure mode from logs)", () => {
    const result = schema.parse({
      requirements: {
        technical: ["Strong TypeScript", { text: "REST APIs", priority: "must" }],
        behavioral: ["Team collaboration"],
      },
    });
    expect(result.company).toBe("Unknown company");
    expect(result.role).toBe("Unknown role");
    expect(result.requirements.length).toBeGreaterThanOrEqual(3);
    expect(result.requirements.every((r) => typeof r.text === "string")).toBe(true);
    expect(result.requirements.some((r) => r.kind === "technical")).toBe(true);
    expect(result.requirements.some((r) => r.kind === "behavioural")).toBe(true);
  });

  it("reads nested role object and alternate field names", () => {
    const result = schema.parse({
      company_name: "Globex",
      role: { title: "Backend Engineer", seniority: "senior", location: "NYC" },
      duties: ["Own services"],
      reqs: [{ description: "Python", category: "technical", importance: "required" }],
    });
    expect(result.company).toBe("Globex");
    expect(result.role).toBe("Backend Engineer");
    expect(result.seniority).toBe("senior");
    expect(result.location).toBe("NYC");
    expect(result.responsibilities).toEqual(["Own services"]);
    expect(result.requirements[0]).toMatchObject({
      text: "Python",
      kind: "technical",
      priority: "must",
    });
  });
});
