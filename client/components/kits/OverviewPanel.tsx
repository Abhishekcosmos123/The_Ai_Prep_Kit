"use client";

import { ClipboardList, Clock, Layers, MessageCircleQuestion } from "lucide-react";
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
  const uncoveredCount = kit.role.requirements.filter((r) => uncoveredIds.has(r.id)).length;

  return (
    <div className="space-y-10 ui-fade-up">
      <StatMetrics
        items={[
          {
            key: "requirements",
            label: "Requirements",
            value: kit.role.requirements.length,
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

      <section>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-bold">Requirements</h2>
          <p className="text-sm text-[var(--muted)]">
            {uncoveredCount === 0 ? (
              <span className="font-medium text-[var(--ok)]">All covered by questions</span>
            ) : (
              <span className="font-medium text-[var(--warn)]">
                {uncoveredCount} still need questions
              </span>
            )}
          </p>
        </div>
        <ul className="divide-y divide-[var(--line)]">
          {kit.role.requirements.map((r) => (
            <RequirementRow key={r.id} requirement={r} covered={!uncoveredIds.has(r.id)} />
          ))}
          {!kit.role.requirements.length ? (
            <li className="py-4 text-sm text-[var(--muted)]">No requirements extracted.</li>
          ) : null}
        </ul>
      </section>

      {kit.role.responsibilities?.length ? (
        <section>
          <h2 className="font-display text-xl font-bold">Role focus</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--ink)]">
            {kit.role.responsibilities.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function RequirementRow({
  requirement,
  covered,
}: {
  requirement: Requirement;
  covered: boolean;
}) {
  return (
    <li className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
          covered ? "bg-[var(--ok)]" : "bg-[var(--warn)]"
        }`}
        title={covered ? "Covered" : "Uncovered"}
        aria-label={covered ? "Covered" : "Uncovered"}
      />
      <div className="min-w-0">
        <p className="text-[0.95rem] leading-snug text-[var(--ink)]">{requirement.text}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {requirement.kind} · {requirement.priority}
          {covered ? "" : " · needs a question"}
        </p>
      </div>
    </li>
  );
}
