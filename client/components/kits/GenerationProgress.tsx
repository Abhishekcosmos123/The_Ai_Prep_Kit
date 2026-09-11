"use client";

import type { GenerationStep } from "@/types/kit";

const STEP_HINTS: Record<string, string> = {
  validate: "Checking your JD, URL, and day count",
  extract: "Pulling must-have and nice-to-have requirements from the JD",
  research: "Crawling the company site and gathering interview context",
  brief: "Writing a grounded company brief from research",
  questions: "Drafting interview questions in separate category calls",
  coverage: "Checking every requirement is covered in application code",
  gaps: "Filling uncovered must-have requirements",
  interviews: "Looking for public interview discussion",
  flashcards: "Building practice flashcards",
  schedule: "Allocating a day-by-day study plan",
  validate_kit: "Validating kit structure",
  persist: "Saving your kit",
};

function stepHint(step: GenerationStep): string {
  const key = Object.keys(STEP_HINTS).find((k) => step.id.toLowerCase().includes(k));
  return key ? STEP_HINTS[key] : step.message || "";
}

function StepIcon({ status }: { status: GenerationStep["status"] }) {
  if (status === "done") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ok-soft)] text-[var(--ok)]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info)]">
        <span className="h-2.5 w-2.5 rounded-full bg-current ui-pulse" />
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--warn-soft)] text-[var(--warn)] text-sm font-bold">
        !
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--wash)] text-[var(--muted)] text-xs">
        –
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
    </span>
  );
}

export function GenerationProgress({
  steps,
  percent,
  status,
  error,
  companyUrl,
}: {
  steps: GenerationStep[];
  percent: number;
  status: string;
  error?: { code?: string; message?: string } | null;
  companyUrl?: string;
}) {
  const running = steps.find((s) => s.status === "running");
  const statusCopy =
    status === "queued"
      ? "Queued — starting shortly"
      : status === "running"
        ? "Generating your kit"
        : status;

  return (
    <div className="ui-panel overflow-hidden">
      <div className="border-b border-[var(--line)] bg-[var(--wash)]/50 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Pipeline
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              {statusCopy}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
              Multi-step research and generation can take a few minutes. This page updates live —
              you can leave and come back from your dashboard.
            </p>
            {companyUrl ? (
              <p className="mt-2 truncate text-xs text-[var(--muted)]">Researching {companyUrl}</p>
            ) : null}
          </div>
          <div className="rounded-lg bg-[var(--surface)] px-3 py-2 text-right shadow-[var(--shadow-sm)]">
            <p className="text-2xl font-semibold tabular-nums text-[var(--ink)]">{percent}%</p>
            <p className="text-xs text-[var(--muted)] capitalize">{status}</p>
          </div>
        </div>
        <div className="ui-meter mt-4 h-2.5">
          <span style={{ width: `${percent}%` }} />
        </div>
        {running ? (
          <p className="mt-3 text-sm font-medium text-[var(--info)]">
            Now: {running.label}
            {running.message ? ` — ${running.message}` : ""}
          </p>
        ) : null}
      </div>

      <ul className="divide-y divide-[var(--line)] px-2 py-1 sm:px-4">
        {steps.map((step) => {
          const hint = step.message || stepHint(step);
          return (
            <li key={step.id} className="flex items-start gap-3 px-2 py-3.5">
              <StepIcon status={step.status} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      step.status === "running" ? "text-[var(--ink)]" : "text-[var(--ink)]"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="ui-badge ui-badge-neutral !normal-case">{step.status}</span>
                </div>
                {hint ? <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p> : null}
              </div>
            </li>
          );
        })}
      </ul>

      {error?.message ? (
        <div className="border-t border-[var(--line)] bg-[var(--warn-soft)] px-6 py-4 text-sm text-[var(--warn)]">
          {error.code ? <strong className="mr-1">{error.code}:</strong> : null}
          {error.message}
        </div>
      ) : null}
    </div>
  );
}
