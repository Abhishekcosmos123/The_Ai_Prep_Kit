import { afterEach, describe, expect, it } from "vitest";
import { validateExternalUrl, localUrlsAllowed } from "../src/utils/urlValidator.js";

const originalAllow = process.env.ALLOW_LOCAL_URLS;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (originalAllow === undefined) delete process.env.ALLOW_LOCAL_URLS;
  else process.env.ALLOW_LOCAL_URLS = originalAllow;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});

describe("validateExternalUrl localhost policy", () => {
  it("allows localhost when ALLOW_LOCAL_URLS is set", async () => {
    process.env.ALLOW_LOCAL_URLS = "true";
    process.env.NODE_ENV = "production";
    const url = await validateExternalUrl("http://localhost:8099/acme/");
    expect(url.href).toContain("localhost:8099");
  });

  it("allows localhost via options.allowLocalhost", async () => {
    process.env.ALLOW_LOCAL_URLS = "false";
    process.env.NODE_ENV = "production";
    const url = await validateExternalUrl("http://localhost:8099/acme/", {
      allowLocalhost: true,
    });
    expect(url.hostname).toBe("localhost");
  });

  it("rejects localhost in production without allow flags", async () => {
    process.env.ALLOW_LOCAL_URLS = "false";
    process.env.NODE_ENV = "production";
    expect(localUrlsAllowed()).toBe(false);
    await expect(validateExternalUrl("http://localhost:8099/acme/")).rejects.toThrow(
      /Localhost/
    );
  });
});
