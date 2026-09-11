"use client";

import type { InterviewKit } from "@/types/kit";
import { Field, TextArea } from "@/components/ui/primitives";
import { IconCheck, IconEdit } from "@/components/ui/Icons";

export function BriefPanel({
  kit,
  editing,
  onToggleEditing,
  onChangeBrief,
}: {
  kit: InterviewKit;
  editing: boolean;
  onToggleEditing: () => void;
  onChangeBrief: (patch: { summary?: string; what_they_do?: string }) => void;
}) {
  return (
    <section className="space-y-5 ui-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Company brief</h2>
        <button
          type="button"
          className="ui-icon-btn"
          title={editing ? "Done editing brief" : "Edit brief"}
          aria-label={editing ? "Done editing brief" : "Edit brief"}
          onClick={onToggleEditing}
        >
          {editing ? <IconCheck /> : <IconEdit />}
        </button>
      </div>
      {editing ? (
        <div className="space-y-4">
          <Field label="Summary">
            <TextArea
              value={kit.company_brief.summary}
              onChange={(e) => onChangeBrief({ summary: e.target.value })}
            />
          </Field>
          <Field label="What they do">
            <TextArea
              value={kit.company_brief.what_they_do}
              onChange={(e) => onChangeBrief({ what_they_do: e.target.value })}
            />
          </Field>
          <p className="text-sm text-[var(--muted)]">Use Save in the header to persist changes.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
              Summary
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[0.95rem] leading-relaxed">
              {kit.company_brief.summary || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
              What they do
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[0.95rem] leading-relaxed">
              {kit.company_brief.what_they_do || "—"}
            </p>
          </div>
        </div>
      )}
      <div className="border-t border-[var(--line)] pt-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Sources</p>
        <ul className="mt-2 space-y-1">
          {kit.company_brief.sources.map((src) => (
            <li key={src} className="truncate text-sm">
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                {src}
              </a>
            </li>
          ))}
          {!kit.company_brief.sources.length ? (
            <li className="text-sm text-[var(--muted)]">No sources.</li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
