import { describe, expect, it } from "vitest";
import {
  cleanMeta,
  companyFromUrl,
  isPlaceholderMeta,
  resolveCompanyName,
} from "../src/utils/metaClean.js";

describe("metaClean", () => {
  it("detects placeholder labels", () => {
    expect(isPlaceholderMeta("Not specified")).toBe(true);
    expect(isPlaceholderMeta("unspecified")).toBe(true);
    expect(isPlaceholderMeta("Unknown company")).toBe(true);
    expect(isPlaceholderMeta("Accenture")).toBe(false);
  });

  it("resolves company from URL when extraction is placeholder", () => {
    expect(
      resolveCompanyName({
        extracted: "Not specified",
        researched: "",
        companyUrl: "https://www.accenture.com/in-en",
      })
    ).toBe("Accenture");
  });

  it("prefers researched name over URL", () => {
    expect(
      resolveCompanyName({
        extracted: "",
        researched: "Accenture",
        companyUrl: "https://example.com",
      })
    ).toBe("Accenture");
  });

  it("companyFromUrl strips www", () => {
    expect(companyFromUrl("https://www.gitlab.com/careers")).toBe("Gitlab");
  });

  it("cleanMeta clears placeholders", () => {
    expect(cleanMeta("Not specified", "fallback")).toBe("fallback");
    expect(cleanMeta("Senior", "fallback")).toBe("Senior");
  });
});
