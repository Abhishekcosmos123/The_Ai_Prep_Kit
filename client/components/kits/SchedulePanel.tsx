"use client";

import { useMemo, useState } from "react";
import type { InterviewKit, Question } from "@/types/kit";
import { Field, TextInput } from "@/components/ui/primitives";
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

  return (
    <section className="space-y-5 ui-fade-up">
      <div>
        <h2 className="font-display text-xl font-bold">Study schedule</h2>
        <p className="text-sm text-[var(--muted)]">
          {kit.schedule.days_available} days · {totalMinutes} min total · use the pencil to edit a
          day
        </p>
      </div>
      <div className="schedule-list">
        {kit.schedule.days.map((day) => {
          const isEditing = editingDay === day.day;
          return (
            <article key={day.day} className="schedule-day">
              <div className="schedule-day-head">
                <div className="min-w-0 flex-1">
                  <p className="schedule-day-label">Day {day.day}</p>
                  {isEditing ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_7rem]">
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
                      <p className="schedule-day-focus">{day.focus || "General prep"}</p>
                      <p className="schedule-day-meta">{day.minutes} minutes</p>
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
                      {q ? (
                        <>
                          <span>{q.category}</span>
                          <p>{q.prompt}</p>
                        </>
                      ) : (
                        <p className="text-[var(--muted)]">Unavailable</p>
                      )}
                    </li>
                  );
                })}
                {!day.question_ids.length ? (
                  <li className="text-[var(--muted)]">No questions assigned.</li>
                ) : null}
              </ol>
            </article>
          );
        })}
      </div>
    </section>
  );
}
