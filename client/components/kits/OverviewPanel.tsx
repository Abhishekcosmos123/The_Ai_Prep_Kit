"use client";

import { ClipboardList, Clock, Layers, MessageCircleQuestion } from "lucide-react";
import type { CSSProperties } from "react";
import type { InterviewKit, Requirement } from "@/types/kit";
import { StatMetrics } from "@/components/ui/StatMetrics";

export function OverviewPanel({
  kit,
  uncoveredIds,
}: {
  kit: InterviewKit;
  uncoveredIds: Set<string>;
}) {
  const totalMinutes = kit.schedule.days.reduce((s, d) => s + d.minutes, 0);
  const totalReqs = kit.role.requirements.length;
  const uncoveredCount = kit.role.requirements.filter((r) => uncoveredIds.has(r.id)).length;
  const coveredCount = Math.max(0, totalReqs - uncoveredCount);
  const coveragePct = totalReqs === 0 ? 100 : Math.round((coveredCount / totalReqs) * 100);
  const mustCount = kit.role.requirements.filter((r) => r.priority === "must").length;
  const niceCount = kit.role.requirements.filter((r) => r.priority === "nice").length;

  return (
    <div className="overview-panel ui-fade-up">
      <header className="overview-head">
        <div className="min-w-0">
          <p className="brief-kicker">Kit snapshot</p>
          <h2 className="font-display text-2xl font-bold tracking-tight">Overview</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Coverage, requirements, and role focus for this prep kit.
          </p>
        </div>
        <div className="overview-coverage" aria-label={`Coverage ${coveragePct}%`}>
          <div
            className="overview-coverage-ring"
            style={{ "--pct": `${coveragePct}` } as CSSProperties}
          >
            <span>{coveragePct}%</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--ink)]">
              {uncoveredCount === 0 ? "Fully covered" : `${uncoveredCount} gaps left`}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {coveredCount}/{totalReqs || 0} requirements have questions
            </p>
          </div>
        </div>
      </header>

      <StatMetrics
        className="overview-stats"
        items={[
          {
            key: "requirements",
            label: "Requirements",
            value: totalReqs,
            icon: ClipboardList,
          },
          {
            key: "questions",
            label: "Questions",
            value: kit.questions.length,
            icon: MessageCircleQuestion,
          },
          {
            key: "flashcards",
            label: "Flashcards",
            value: kit.flashcards.length,
            icon: Layers,
          },
          {
            key: "minutes",
            label: "Study minutes",
            value: totalMinutes,
            icon: Clock,
          },
        ]}
      />

      <section className="overview-section">
        <div className="overview-section-head">
          <div>
            <h3 className="font-display text-lg font-bold">Requirements</h3>
            <p className="text-sm text-[var(--muted)]">
              {mustCount} must · {niceCount} nice
            </p>
          </div>
          {uncoveredCount === 0 ? (
            <span className="overview-pill overview-pill-ok">All covered</span>
          ) : (
            <span className="overview-pill overview-pill-warn">
              {uncoveredCount} need questions
            </span>
          )}
        </div>

        <ul className="req-card-list">
          {kit.role.requirements.map((r) => (
            <RequirementCard key={r.id} requirement={r} covered={!uncoveredIds.has(r.id)} />
          ))}
          {!kit.role.requirements.length ? (
            <li className="req-card req-card-empty">No requirements extracted from this JD.</li>
          ) : null}
        </ul>
      </section>

      {kit.role.responsibilities?.length ? (
        <section className="overview-section">
          <div className="overview-section-head">
            <div>
              <h3 className="font-display text-lg font-bold">Role focus</h3>
              <p className="text-sm text-[var(--muted)]">Key responsibilities from the posting</p>
            </div>
          </div>
          <ul className="role-focus-list">
            {kit.role.responsibilities.map((item, i) => (
              <li key={i} className="role-focus-item">
                <span className="role-focus-index" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p>{item}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function RequirementCard({
  requirement,
  covered,
}: {
  requirement: Requirement;
  covered: boolean;
}) {
  return (
    <li className={`req-card ${covered ? "is-covered" : "is-gap"}`}>
      <div className="req-card-top">
        <span className={`req-priority ${requirement.priority}`}>
          {requirement.priority}
        </span>
        <span className="req-kind">{requirement.kind}</span>
        <span className={`req-cover-badge ${covered ? "ok" : "warn"}`}>
          {covered ? "Covered" : "Needs question"}
        </span>
      </div>
      <p className="req-card-text">{requirement.text}</p>
    </li>
  );
}
