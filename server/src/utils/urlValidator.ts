import net from "node:net";
import { lookup } from "node:dns/promises";

export class UrlValidationError extends Error {
  code = "INVALID_URL";
  constructor(message: string) {
    super(message);
    this.name = "UrlValidationError";
  }
}

export interface UrlValidationOptions {
  /** Allow private IPs (10/8, 192.168/16, etc.) and loopback. */
  allowPrivate?: boolean;
  /** Allow localhost / *.localhost hostnames (needed for evaluate fixtures). */
  allowLocalhost?: boolean;
}

function isPrivateIp(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip === "0.0.0.0") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;
  const parts = ip.split(".").map(Number);
  if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }
  if (ip.toLowerCase().startsWith("fc") || ip.toLowerCase().startsWith("fd")) return true;
  if (ip.toLowerCase().startsWith("fe80")) return true;
  return false;
}

/** Runtime check so evaluate can flip ALLOW_LOCAL_URLS after process start. */
export function localUrlsAllowed(options: UrlValidationOptions = {}): boolean {
  if (options.allowPrivate || options.allowLocalhost) return true;
  const flag = process.env.ALLOW_LOCAL_URLS;
  if (flag === "true" || flag === "1") return true;
  // Convenient for local web/dev against fixtures; production stays locked down.
  const nodeEnv = process.env.NODE_ENV || "development";
  return nodeEnv === "development" || nodeEnv === "test";
}

export async function validateExternalUrl(
  raw: string,
  options: UrlValidationOptions = {}
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UrlValidationError("Company URL must be a valid HTTP or HTTPS URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UrlValidationError("Only HTTP and HTTPS URLs are allowed.");
  }

  const allowLocal = localUrlsAllowed(options);
  const host = url.hostname.toLowerCase();

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    if (!allowLocal) {
      throw new UrlValidationError("Localhost URLs are not allowed.");
    }
    return url;
  }

  if (net.isIP(host)) {
    if (!allowLocal && isPrivateIp(host)) {
      throw new UrlValidationError("Private IP addresses are not allowed.");
    }
    return url;
  }

  if (!allowLocal) {
    try {
      const records = await lookup(host, { all: true });
      for (const record of records) {
        if (isPrivateIp(record.address)) {
          throw new UrlValidationError("URL resolves to a private or loopback address.");
        }
      }
    } catch (error) {
      if (error instanceof UrlValidationError) throw error;
      // DNS failure is handled later during fetch; allow URL shape validation to pass.
    }
  }

  return url;
}

export function normalizeUrl(base: string, href: string): string | null {
  try {
    const url = new URL(href, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function sameRegistrableDomain(a: string, b: string): boolean {
  try {
    return new URL(a).hostname.toLowerCase() === new URL(b).hostname.toLowerCase();
  } catch {
    return false;
  }
}
