/** Treat LLM filler labels as empty so we can fall back to research / URL. */
export function isPlaceholderMeta(value: unknown): boolean {
  if (value == null) return true;
  const raw = String(value).trim();
  if (!raw) return true;
  return /^(not\s*specified|unspecified|unknown(\s+(company|role|location|seniority))?|n\/?a|none|null|undefined|-|—|–)$/i.test(
    raw
  );
}

export function cleanMeta(value: unknown, fallback = ""): string {
  const raw = String(value ?? "").trim();
  if (!raw || isPlaceholderMeta(raw)) return fallback;
  return raw;
}

/** accenture.com → Accenture */
export function companyFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "");
    const slug = host.split(".")[0] || "";
    if (!slug || slug.length < 2) return "";
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  } catch {
    return "";
  }
}

export function resolveCompanyName(options: {
  extracted?: string;
  researched?: string;
  companyUrl?: string;
}): string {
  return (
    cleanMeta(options.extracted) ||
    cleanMeta(options.researched) ||
    companyFromUrl(options.companyUrl || "") ||
    "Company"
  );
}
