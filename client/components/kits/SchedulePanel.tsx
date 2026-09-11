"use client";

import { useMemo } from "react";
import { CalendarDays, Clock, ListChecks } from "lucide-react";
import type { InterviewKit, Question } from "@/types/kit";
import { StatMetrics } from "@/components/ui/StatMetrics";
import { byId } from "@/lib/kitOrder";

export function SchedulePanel({ kit }: { kit: InterviewKit }) {
  const questionById = useMemo(() => byId(kit.questions), [kit.questions]);
  const totalMinutes = kit.schedule.days.reduce((s, d) => s + d.minutes, 0);
  const assignedQuestions = kit.schedule.days.reduce((s, d) => s + d.question_ids.length, 0);

  return (
    <section className="space-y-8 ui-fade-up">
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-xl font-bold">Study schedule</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            A day-by-day plan built from your questions. Regenerate the schedule from the header if
            you need a fresh allocation.
          </p>
        </div>

        <StatMetrics
          columns={3}
          items={[
            {
              key: "days",
              label: "Days",
              value: kit.schedule.days_available,
              icon: CalendarDays,
            },
            {
              key: "minutes",
              label: "Total minutes",
              value: totalMinutes,
              icon: Clock,
            },
            {
              key: "questions",
              label: "Assigned questions",
              value: assignedQuestions,
              icon: ListChecks,
            },
          ]}
        />
      </div>

      <ol className="schedule-timeline">
        {kit.schedule.days.map((day) => {
          const questionCount = day.question_ids.length;

          return (
            <li key={day.day} className="schedule-day">
              <div className="schedule-day-marker" aria-hidden>
                <span className="schedule-day-num">{day.day}</span>
              </div>

              <article className="schedule-day-body">
                <div className="schedule-day-head">
                  <div className="min-w-0 flex-1">
                    <p className="schedule-day-label">Day {day.day}</p>
                    <h3 className="schedule-day-focus">{day.focus || "General prep"}</h3>
                    <div className="schedule-day-chips">
                      <span className="ui-badge ui-badge-accent">{day.minutes} min</span>
                      <span className="ui-badge ui-badge-neutral">
                        {questionCount} {questionCount === 1 ? "question" : "questions"}
                      </span>
                    </div>
                  </div>
                </div>

                <ol className="schedule-qs">
                  {day.question_ids.map((qid, i) => {
                    const q = questionById.get(qid) as Question | undefined;
                    return (
                      <li key={`${qid}-${i}`}>
                        <span className="schedule-q-index" aria-hidden>
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          {q ? (
                            <>
                              <span className="ui-badge ui-badge-neutral">{q.category}</span>
                              <p className="schedule-q-prompt">{q.prompt}</p>
                            </>
                          ) : (
                            <p className="text-[var(--muted)]">Unavailable</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                  {!day.question_ids.length ? (
                    <li className="schedule-qs-empty">
                      <p className="text-sm text-[var(--muted)]">No questions assigned.</p>
                    </li>
                  ) : null}
                </ol>
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
