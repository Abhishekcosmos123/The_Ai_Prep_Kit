type Level = "info" | "warn" | "error" | "debug";

const LEVEL_RANK: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function configuredMinLevel(): Level {
  const raw = (process.env.LOG_LEVEL || "info").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") return raw;
  return "info";
}

function shouldLog(level: Level): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[configuredMinLevel()];
}

function log(level: Level, message: string, meta?: unknown): void {
  if (!shouldLog(level)) return;
  const payload = meta === undefined ? "" : ` ${safeJson(meta)}`;
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}${payload}`;
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function safeJson(meta: unknown): string {
  try {
    return JSON.stringify(meta);
  } catch {
    return JSON.stringify({ note: "meta_not_serializable" });
  }
}

/** Truncate long strings for log previews (JD snippets, LLM JSON, etc.). */
export function preview(value: unknown, max = 240): string {
  const text = typeof value === "string" ? value : safeJson(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…(+${text.length - max} chars)`;
}

export const logger = {
  info: (message: string, meta?: unknown) => log("info", message, meta),
  warn: (message: string, meta?: unknown) => log("warn", message, meta),
  error: (message: string, meta?: unknown) => log("error", message, meta),
  debug: (message: string, meta?: unknown) => log("debug", message, meta),
  child(context: Record<string, unknown>) {
    const wrap =
      (level: Level) =>
      (message: string, meta?: unknown): void => {
        const merged =
          meta && typeof meta === "object" && !Array.isArray(meta)
            ? { ...context, ...(meta as Record<string, unknown>) }
            : meta === undefined
              ? context
              : { ...context, detail: meta };
        log(level, message, merged);
      };
    return {
      info: wrap("info"),
      warn: wrap("warn"),
      error: wrap("error"),
      debug: wrap("debug"),
    };
  },
};
