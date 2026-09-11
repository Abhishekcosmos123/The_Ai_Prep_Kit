/** Client-side helpers for placeholder company/role metadata. */

export function isPlaceholderMeta(value: unknown): boolean {
  if (value == null) return true;
  const raw = String(value).trim();
  if (!raw) return true;
  return /^(not\s*specified|unspecified|unknown(\s+(company|role|location|seniority))?|n\/?a|none|null|undefined|-|—|–|pending)$/i.test(
    raw
  );
}

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

export function displayCompany(kit: {
  source: { company?: string; company_url?: string };
  company_brief?: { summary?: string };
}): string {
  const raw = (kit.source.company || "").trim();
  if (raw && !isPlaceholderMeta(raw)) return raw;
  const fromUrl = companyFromUrl(kit.source.company_url || "");
  if (fromUrl) return fromUrl;
  const summary = kit.company_brief?.summary || "";
  const match = summary.match(/\b([A-Z][A-Za-z0-9&]*(?:\s+[A-Z][A-Za-z0-9&]*){0,2})\b/);
  if (match?.[1] && !isPlaceholderMeta(match[1])) return match[1];
  return "Company";
}

export function displayMeta(value: string | undefined, fallback = ""): string {
  const raw = (value || "").trim();
  if (!raw || isPlaceholderMeta(raw)) return fallback;
  return raw;
}
