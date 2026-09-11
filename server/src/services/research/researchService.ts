import * as cheerio from "cheerio";
import robotsParserImport from "robots-parser";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import type { FetchedPage } from "../../types/research.js";
import { withRetry } from "../../utils/retry.js";
import { cleanText, truncate } from "../../utils/textCleaner.js";
import {
  normalizeUrl,
  sameRegistrableDomain,
  validateExternalUrl,
  localUrlsAllowed,
} from "../../utils/urlValidator.js";

const MAX_BYTES = 1_500_000;
const USER_AGENT = "TheAiPrepKitBot/1.0 (+https://localhost; research for interview prep)";

type RobotsRules = {
  isAllowed(url: string, ua?: string): boolean | undefined;
};

const robotsParser = robotsParserImport as unknown as (
  url: string,
  robotstxt: string
) => RobotsRules;

function pickCompanyName(title: string | undefined, hostname: string): string {
  const host = hostname.replace(/^www\./, "").split(".")[0] || hostname;
  if (!title?.trim()) return host;
  const first = title.split("|")[0]?.split(" - ")[0]?.split("–")[0]?.trim() || title.trim();
  // Marketing slogans are usually long; prefer hostname brand when title is a tagline.
  if (first.length > 48) return host.charAt(0).toUpperCase() + host.slice(1);
  return first;
}

export class PageFetcher {
  private robotsCache = new Map<string, RobotsRules | null>();
  async fetch(url: string): Promise<FetchedPage> {
    try {
      await validateExternalUrl(url, {
        allowPrivate: localUrlsAllowed(),
        allowLocalhost: localUrlsAllowed(),
      });

      const allowed = await this.isAllowedByRobots(url);
      if (!allowed) {
        return {
          url,
          title: "",
          text: "",
          links: [],
          ok: false,
          error: "Blocked by robots.txt",
        };
      }

      const response = await withRetry(
        async () => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), env.FETCH_TIMEOUT_MS);
          try {
            const res = await fetch(url, {
              signal: controller.signal,
              headers: {
                "User-Agent": USER_AGENT,
                Accept: "text/html,application/xhtml+xml",
              },
              redirect: "follow",
            });
            return res;
          } finally {
            clearTimeout(timer);
          }
        },
        { maxAttempts: 3, baseDelayMs: 400 }
      );

      if (!response.ok) {
        return {
          url,
          title: "",
          text: "",
          links: [],
          ok: false,
          error: `HTTP ${response.status}`,
        };
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
        return {
          url,
          title: "",
          text: "",
          links: [],
          ok: false,
          error: `Unsupported content-type: ${contentType}`,
        };
      }

      const buf = Buffer.from(await response.arrayBuffer());
      if (buf.byteLength > MAX_BYTES) {
        return {
          url,
          title: "",
          text: "",
          links: [],
          ok: false,
          error: "Response too large",
        };
      }

      const html = buf.toString("utf8");
      const $ = cheerio.load(html);
      $("script, style, noscript, svg, iframe").remove();
      const title = cleanText($("title").first().text() || $("h1").first().text() || "");
      const text = truncate(cleanText($("body").text() || $.root().text()), 20000);
      const links: string[] = [];
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        const normalized = normalizeUrl(url, href);
        if (normalized) links.push(normalized);
      });

      return { url: response.url || url, title, text, links: [...new Set(links)], ok: true };
    } catch (error) {
      logger.warn("Page fetch failed", {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        url,
        title: "",
        text: "",
        links: [],
        ok: false,
        error: error instanceof Error ? error.message : "Fetch failed",
      };
    }
  }

  private async isAllowedByRobots(url: string): Promise<boolean> {
    try {
      const parsed = new URL(url);
      const robotsUrl = `${parsed.origin}/robots.txt`;
      if (!this.robotsCache.has(parsed.origin)) {
        try {
          const res = await fetch(robotsUrl, {
            headers: { "User-Agent": USER_AGENT },
            signal: AbortSignal.timeout(env.FETCH_TIMEOUT_MS),
          });
          if (!res.ok) {
            this.robotsCache.set(parsed.origin, null);
          } else {
            const body = await res.text();
            this.robotsCache.set(parsed.origin, robotsParser(robotsUrl, body));          }
        } catch {
          this.robotsCache.set(parsed.origin, null);
        }
      }
      const robots = this.robotsCache.get(parsed.origin);
      if (!robots) return true;
      return robots.isAllowed(url, USER_AGENT) !== false;
    } catch {
      return true;
    }
  }
}

const SIGNAL_WORDS: Array<{ word: string; weight: number }> = [
  { word: "about", weight: 8 },
  { word: "company", weight: 6 },
  { word: "who-we-are", weight: 10 },
  { word: "who we are", weight: 10 },
  { word: "careers", weight: 14 },
  { word: "jobs", weight: 12 },
  { word: "hiring", weight: 13 },
  { word: "work", weight: 4 },
  { word: "culture", weight: 8 },
  { word: "interview", weight: 14 },
  { word: "engineering", weight: 9 },
  { word: "teams", weight: 5 },
  { word: "mission", weight: 6 },
  { word: "values", weight: 5 },
  { word: "product", weight: 4 },
  { word: "research", weight: 5 },
  { word: "blog", weight: 3 },
];

const NOISE_WORDS: Array<{ word: string; weight: number }> = [
  { word: "privacy", weight: -12 },
  { word: "cookie", weight: -10 },
  { word: "legal", weight: -10 },
  { word: "terms", weight: -10 },
  { word: "accessibility", weight: -8 },
  { word: "trademark", weight: -8 },
  { word: "investor", weight: -4 },
  { word: "newsroom", weight: -2 },
];

export class LinkRanker {
  rank(links: string[], seedUrl: string): Array<{ url: string; score: number; reason: string }> {
    const scored = new Map<string, { score: number; reason: string }>();

    for (const link of links) {
      if (!sameRegistrableDomain(seedUrl, link)) continue;
      const lower = link.toLowerCase();
      let score = 0;
      const reasons: string[] = [];
      for (const signal of SIGNAL_WORDS) {
        if (lower.includes(signal.word.replace(/\s+/g, "")) || lower.includes(signal.word)) {
          score += signal.weight;
          reasons.push(`+${signal.word}`);
        }
      }
      for (const noise of NOISE_WORDS) {
        if (lower.includes(noise.word)) {
          score += noise.weight;
          reasons.push(noise.word);
        }
      }
      // Prefer shorter paths slightly
      try {
        const pathLen = new URL(link).pathname.split("/").filter(Boolean).length;
        score += Math.max(0, 3 - pathLen);
      } catch {
        /* ignore */
      }
      if (score <= 0) continue;
      const prev = scored.get(link);
      if (!prev || score > prev.score) {
        scored.set(link, { score, reason: reasons.join(",") || "path heuristics" });
      }
    }

    return [...scored.entries()]
      .map(([url, meta]) => ({ url, ...meta }))
      .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));
  }
}

export class Crawler {
  constructor(
    private readonly fetcher = new PageFetcher(),
    private readonly ranker = new LinkRanker()
  ) {}

  async crawl(seedUrl: string, maxPages = env.MAX_CRAWL_PAGES) {
    logger.info("research.crawl.start", { seedUrl, maxPages });
    const homepage = await this.fetcher.fetch(seedUrl);
    const pages: FetchedPage[] = [homepage];
    const notes: string[] = [];

    if (!homepage.ok) {
      notes.push(`Homepage unreachable: ${homepage.error || "unknown error"}`);
      logger.warn("research.crawl.homepage_failed", {
        seedUrl,
        error: homepage.error,
      });
      return { homepage, pages, notes, unreachable: true };
    }

    const ranked = this.ranker.rank(homepage.links, seedUrl);
    logger.debug("research.crawl.ranked_links", {
      seedUrl,
      link_count: homepage.links.length,
      top: ranked.slice(0, 8).map((r) => ({ url: r.url, score: r.score, reason: r.reason })),
    });
    const seen = new Set<string>([homepage.url]);

    for (const item of ranked) {
      if (pages.length >= maxPages) break;
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      const page = await this.fetcher.fetch(item.url);
      pages.push(page);
      if (!page.ok) {
        notes.push(`Skipped ${item.url}: ${page.error}`);
        logger.warn("research.crawl.page_failed", { url: item.url, error: page.error });
      } else {
        logger.debug("research.crawl.page_ok", {
          url: page.url,
          title: page.title,
          text_chars: page.text.length,
        });
      }
    }

    logger.info("research.crawl.done", {
      seedUrl,
      fetched: pages.length,
      ok: pages.filter((p) => p.ok).length,
    });
    return { homepage, pages, notes, unreachable: false };
  }
}

export class InterviewResearch {
  async search(companyName: string, role: string) {
    // Public discussion discovery without inventing experiences.
    // Uses DuckDuckGo HTML (no key). Failures are non-fatal.
    const query = encodeURIComponent(`${companyName} ${role} interview experience`);
    const url = `https://html.duckduckgo.com/html/?q=${query}`;
    const notes: string[] = [];
    const sources: string[] = [];
    const excerpts: Array<{ url: string; text: string }> = [];

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), env.FETCH_TIMEOUT_MS);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT },
      });
      clearTimeout(timer);

      if (!res.ok) {
        notes.push("No public interview discussion page could be retrieved.");
        return { sources, excerpts, notes };
      }

      const html = await res.text();
      const $ = cheerio.load(html);
      $(".result").each((i, el) => {
        if (i >= 5) return;
        const href = $(el).find("a.result__a").attr("href");
        const snippet = cleanText($(el).find(".result__snippet").text());
        if (href && snippet) {
          sources.push(href);
          excerpts.push({ url: href, text: truncate(snippet, 400) });
        }
      });

      if (sources.length === 0) {
        notes.push("No public interview discussions were found.");
      }
    } catch (error) {
      notes.push(
        `Public interview research skipped: ${error instanceof Error ? error.message : "error"}`
      );
    }

    return { sources, excerpts, notes };
  }
}

export class ResearchService {
  constructor(
    private readonly crawler = new Crawler(),
    private readonly interviewResearch = new InterviewResearch()
  ) {}

  async researchCompany(companyUrl: string) {
    logger.info("research.company.start", { companyUrl });
    const validated = await validateExternalUrl(companyUrl, {
      allowPrivate: localUrlsAllowed(),
      allowLocalhost: localUrlsAllowed(),
    });
    const crawl = await this.crawler.crawl(validated.toString());
    const okPages = crawl.pages.filter((p) => p.ok && p.text.length > 40);
    const failedPages = crawl.pages.filter((p) => !p.ok);
    const pages_used = okPages.map((p) => p.url);

    const hiring_info_found = okPages.some((p) =>
      /career|job|hiring|interview|culture|team/i.test(`${p.url} ${p.title} ${p.text.slice(0, 500)}`)
    );

    const company_name =
      pickCompanyName(crawl.homepage.title, validated.hostname) ||
      validated.hostname.replace(/^www\./, "");

    const notes = [...crawl.notes];
    if (!hiring_info_found) {
      notes.push("No hiring/interview process page could be discovered.");
    }

    logger.info("research.company.done", {
      company_name,
      ok_pages: okPages.length,
      failed_pages: failedPages.length,
      hiring_info_found,
      unreachable: crawl.unreachable,
      pages_used,
      failed: failedPages.slice(0, 5).map((p) => ({ url: p.url, error: p.error })),
      notes: notes.slice(0, 5),
    });

    return {
      homepage_url: validated.toString(),
      company_name,
      pages: okPages,
      pages_used,
      notes,
      hiring_info_found,
      unreachable: crawl.unreachable,
    };
  }

  async researchInterviews(companyName: string, role: string) {
    logger.info("research.interviews.start", { companyName, role });
    const result = await this.interviewResearch.search(companyName, role);
    logger.info("research.interviews.done", {
      sources: result.sources.length,
      notes: result.notes.slice(0, 3),
    });
    return result;
  }
}
