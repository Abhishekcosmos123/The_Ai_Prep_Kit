export type BatchCase = {
  jd: string;
  company_url: string;
  days: number;
};

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

/**
 * Accepts either:
 * - JSON array: [{ id?, jd, company_url, days }]
 * - CSV with header: jd,company_url,days (id optional)
 */
export function parseCasesFile(text: string, filename: string): BatchCase[] {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("File is empty.");

  if (filename.toLowerCase().endsWith(".json") || trimmed.startsWith("[")) {
    const raw = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(raw)) throw new Error("JSON must be an array of cases.");
    return raw.map((item, index) => {
      if (!item || typeof item !== "object") {
        throw new Error(`Case ${index + 1} is invalid.`);
      }
      const row = item as Record<string, unknown>;
      const jd = String(row.jd ?? "").trim();
      const company_url = String(row.company_url ?? row.companyUrl ?? "").trim();
      const days = Number(row.days);
      if (!jd || !company_url || !Number.isInteger(days)) {
        throw new Error(`Case ${index + 1} needs jd, company_url, and integer days.`);
      }
      return { jd, company_url, days };
    });
  }

  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV needs a header row and at least one case.");

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const jdIdx = header.findIndex((h) => h === "jd" || h === "job_description");
  const urlIdx = header.findIndex(
    (h) => h === "company_url" || h === "companyurl" || h === "url"
  );
  const daysIdx = header.findIndex((h) => h === "days");
  if (jdIdx < 0 || urlIdx < 0 || daysIdx < 0) {
    throw new Error("CSV header must include jd, company_url, and days.");
  }

  return lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line);
    const jd = (cells[jdIdx] || "").trim();
    const company_url = (cells[urlIdx] || "").trim();
    const days = Number(cells[daysIdx]);
    if (!jd || !company_url || !Number.isInteger(days)) {
      throw new Error(`CSV row ${index + 2} needs jd, company_url, and integer days.`);
    }
    return { jd, company_url, days };
  });
}
