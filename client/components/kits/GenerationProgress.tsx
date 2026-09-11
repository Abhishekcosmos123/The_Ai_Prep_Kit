"use client";

import { useState } from "react";
import type { GenerationStep } from "@/types/kit";
import { IconCheck, IconLink } from "@/components/ui/Icons";

const HINTS: Record<string, string> = {
  validate: "Checking JD, URL, and day count before research starts.",
  extract: "Pulling must-have and nice-to-have requirements from the posting.",
  research: "Crawling the company site and ranking hiring / about pages.",
  interviews: "Searching public discussion of this company’s interview process.",
  brief: "Writing a grounded company brief from fetched pages only.",
  questions: "Generating questions in separate category calls.",
  coverage: "Deterministic check: every requirement needs a linked question.",
  gaps: "Generating questions for any still-uncovered requirements.",
  flashcards: "Building study flashcards tied to requirement IDs.",
  schedule: "Allocating topics across your available days in code.",
  validate_kit: "Validating the kit structure before save.",
};

function stepHint(step: GenerationStep) {
  const key = Object.keys(HINTS).find((k) => step.id.includes(k));
  return step.message || (key ? HINTS[key] : "") || "Pipeline step";
}

function statusCopy(status: GenerationStep["status"]) {
  if (status === "done") return "Completed";
  if (status === "running") return "In progress";
  if (status === "error") return "Failed";
  if (status === "skipped") return "Skipped";
  return "Waiting";
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
  const [hoverId, setHoverId] = useState<string | null>(null);
  const running = steps.find((s) => s.status === "running");
  const doneCount = steps.filter((s) => s.status === "done" || s.status === "skipped").length;
  const stepIndex = running ? steps.findIndex((s) => s.id === running.id) + 1 : doneCount;
  const title =
    status === "queued"
      ? "Queued — starting shortly"
      : status === "running"
        ? "Building your prep kit"
        : status === "completed"
          ? "Prep kit ready"
          : status;

  return (
    <section className="pipeline ui-fade-up">
      <div className="pipeline-top">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
            Pipeline roadmap · autonomous agent
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
            Hover any step for details. You can safely navigate away — progress is saved.
          </p>
          {companyUrl ? (
            <a
              href={companyUrl}
              target="_blank"
              rel="noreferrer"
              className="research-chip mt-4"
            >
              <span className="status-dot ok" />
              <span className="truncate">Researching: {companyUrl}</span>
              <IconLink size={14} />
            </a>
          ) : null}
        </div>

        <div className="pipeline-progress-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-4xl font-bold tabular-nums tracking-tight">{percent}%</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="ui-badge ui-badge-ok capitalize">{status}</span>
              </div>
            </div>
            <div className="pipeline-ring" aria-hidden>
              <svg viewBox="0 0 36 36">
                <path
                  d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 1 1 0-31"
                  fill="none"
                  stroke="var(--wash)"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 1 1 0-31"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.max(0, Math.min(100, percent)) * 0.97}, 100`}
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="pipeline-bar-wrap">
        <div className="ui-meter ui-meter-ok h-2">
          <span style={{ width: `${percent}%` }} />
        </div>
        <div className="pipeline-bar-meta">
          <span>
            {running ? (
              <>
                Now: <strong>{running.label}</strong>
                {running.message ? ` — ${running.message}` : ""}
              </>
            ) : (
              <strong className="capitalize">{status}</strong>
            )}
          </span>
          <span>
            Step {Math.min(stepIndex || 1, steps.length || 1)} of {steps.length || "—"}
          </span>
        </div>
      </div>

      <ol className="roadmap" aria-label="Generation steps">
        {steps.map((step, index) => {
          const left = index % 2 === 0;
          const active = step.status === "running";
          const done = step.status === "done";
          const failed = step.status === "error";
          const pending = step.status === "pending" || step.status === "skipped";
          const showTip = hoverId === step.id;
          return (
            <li
              key={step.id}
              className={`roadmap-step ${left ? "roadmap-left" : "roadmap-right"} ${active ? "is-active" : ""} ${done ? "is-done" : ""} ${failed ? "is-error" : ""} ${pending && !active && !done && !failed ? "is-pending" : ""}`}
              onMouseEnter={() => setHoverId(step.id)}
              onMouseLeave={() => setHoverId(null)}
              onFocus={() => setHoverId(step.id)}
              onBlur={() => setHoverId(null)}
              tabIndex={0}
            >
              <div className="roadmap-node" aria-hidden>
                {done ? <IconCheck size={16} /> : active ? <span className="roadmap-pulse" /> : index + 1}
              </div>
              <div className={`roadmap-card ${active ? "roadmap-card-active" : ""}`}>
                <p className={`roadmap-pill ${done ? "ok" : active ? "run" : "wait"}`}>
                  {statusCopy(step.status)}
                </p>
                <p className="roadmap-label">{step.label}</p>
                <p className="roadmap-status">{stepHint(step)}</p>
                {active && step.message ? (
                  <p className="roadmap-live">{step.message}</p>
                ) : null}
              </div>
              {showTip ? (
                <div className={`roadmap-tip ${left ? "tip-right" : "tip-left"}`} role="tooltip">
                  <p style={{ margin: 0, fontWeight: 700 }}>{step.label}</p>
                  <p
                    style={{
                      margin: "0.35rem 0 0",
                      fontSize: "0.72rem",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#9ae6c1",
                    }}
                  >
                    {statusCopy(step.status)}
                  </p>
                  <p
                    style={{
                      margin: "0.55rem 0 0",
                      fontSize: "0.875rem",
                      lineHeight: 1.45,
                      color: "rgba(255,255,255,0.82)",
                    }}
                  >
                    {stepHint(step)}
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {error?.message ? (
        <div className="mt-8 rounded-xl border border-[var(--warn)]/30 bg-[var(--warn-soft)] px-4 py-3 text-sm text-[var(--warn)]">
          {error.code ? <strong className="mr-1">{error.code}:</strong> : null}
          {error.message}
        </div>
      ) : null}

      <p className="pipeline-foot">
        <span className="status-dot ok" />
        Progress auto-saves — you can leave this page anytime.
      </p>
    </section>
  );
}
