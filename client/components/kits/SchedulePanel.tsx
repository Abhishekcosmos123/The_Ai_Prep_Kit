"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Clock, ListChecks } from "lucide-react";
import type { InterviewKit, Question } from "@/types/kit";
import { Field, TextInput } from "@/components/ui/primitives";
import { StatMetrics } from "@/components/ui/StatMetrics";
import { IconCheck, IconEdit } from "@/components/ui/Icons";
import { byId } from "@/lib/kitOrder";

export function SchedulePanel({
  kit,
  onPatchDay,
}: {
  kit: InterviewKit;
  onPatchDay: (dayNum: number, patch: { focus?: string; minutes?: number }) => void;
}) {
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const questionById = useMemo(() => byId(kit.questions), [kit.questions]);
  const totalMinutes = kit.schedule.days.reduce((s, d) => s + d.minutes, 0);
  const assignedQuestions = kit.schedule.days.reduce((s, d) => s + d.question_ids.length, 0);

  return (
    <section className="space-y-8 ui-fade-up">
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-xl font-bold">Study schedule</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            A day-by-day plan. Tap the pencil on any day to adjust focus or time.
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
          const isEditing = editingDay === day.day;
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
                    {isEditing ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_7rem]">
                        <Field label="Focus">
                          <TextInput
                            value={day.focus}
                            onChange={(e) => onPatchDay(day.day, { focus: e.target.value })}
                          />
                        </Field>
                        <Field label="Minutes">
                          <TextInput
                            type="number"
                            min={1}
                            value={day.minutes}
                            onChange={(e) =>
                              onPatchDay(day.day, { minutes: Number(e.target.value) })
                            }
                          />
                        </Field>
                      </div>
                    ) : (
                      <>
                        <h3 className="schedule-day-focus">{day.focus || "General prep"}</h3>
                        <div className="schedule-day-chips">
                          <span className="ui-badge ui-badge-accent">{day.minutes} min</span>
                          <span className="ui-badge ui-badge-neutral">
                            {questionCount} {questionCount === 1 ? "question" : "questions"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    className="ui-icon-btn shrink-0"
                    title={isEditing ? "Done editing day" : "Edit day"}
                    aria-label={isEditing ? "Done editing day" : "Edit day"}
                    onClick={() => setEditingDay(isEditing ? null : day.day)}
                  >
                    {isEditing ? <IconCheck /> : <IconEdit />}
                  </button>
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
