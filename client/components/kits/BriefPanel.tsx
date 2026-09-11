"use client";

import { useState } from "react";
import type { InterviewKit } from "@/types/kit";
import { Field, TextArea } from "@/components/ui/primitives";
import { IconEdit, IconGlobe, IconLink, IconSave } from "@/components/ui/Icons";
import { ModalShell } from "@/components/ui/ModalShell";

type BriefFields = { summary: string; what_they_do: string };

export function BriefPanel({
  kit,
  onSaveBrief,
}: {
  kit: InterviewKit;
  onSaveBrief: (patch: BriefFields) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BriefFields>({
    summary: kit.company_brief.summary,
    what_they_do: kit.company_brief.what_they_do,
  });

  function startEdit() {
    setDraft({
      summary: kit.company_brief.summary,
      what_they_do: kit.company_brief.what_they_do,
    });
    setOpen(true);
  }

  function apply() {
    onSaveBrief({
      summary: draft.summary.trim(),
      what_they_do: draft.what_they_do.trim(),
    });
    setOpen(false);
  }

  const sources = kit.company_brief.sources;
  const company = kit.source.company || "Company";

  return (
    <section className="brief-panel ui-fade-up">
      <header className="brief-panel-head">
        <div className="min-w-0">
          <p className="brief-kicker">
            <IconGlobe size={14} />
            Company research
          </p>
          <h2 className="font-display text-2xl font-bold tracking-tight">{company}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Brief generated from the company site. Open the editor to change the text.
          </p>
        </div>
        <button type="button" className="ui-btn ui-btn-secondary !text-sm" onClick={startEdit}>
          <IconEdit size={16} />
          Edit brief
        </button>
      </header>

      <div className="brief-prose-grid">
        <article className="brief-prose-card">
          <p className="brief-section-label">Summary</p>
          <p className="brief-prose">{kit.company_brief.summary?.trim() || "No summary yet."}</p>
        </article>
        <article className="brief-prose-card">
          <p className="brief-section-label">What they do</p>
          <p className="brief-prose">
            {kit.company_brief.what_they_do?.trim() || "No description yet."}
          </p>
        </article>
      </div>

      <div className="brief-sources">
        <div className="brief-sources-head">
          <p className="brief-section-label">Sources</p>
          <span className="brief-sources-count">{sources.length}</span>
        </div>
        {sources.length ? (
          <ul className="brief-source-list">
            {sources.map((src) => {
              let host = src;
              try {
                host = new URL(src).hostname.replace(/^www\./, "");
              } catch {
                /* keep raw */
              }
              return (
                <li key={src}>
                  <a href={src} target="_blank" rel="noreferrer" className="brief-source-link">
                    <span className="brief-source-icon" aria-hidden>
                      <IconLink size={14} />
                    </span>
                    <span className="min-w-0">
                      <span className="brief-source-host">{host}</span>
                      <span className="brief-source-url">{src}</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-[var(--muted)]">No sources recorded for this brief.</p>
        )}
      </div>

      {open ? (
        <ModalShell
          eyebrow="Company brief"
          title="Edit brief"
          titleId="brief-editor-title"
          wide
          onClose={() => setOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" className="ui-btn ui-btn-secondary" onClick={() => setOpen(false)}>
                Discard
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-primary inline-flex items-center gap-2"
                onClick={apply}
              >
                <IconSave size={16} />
                Apply changes
              </button>
            </div>
          }
        >
          <div className="grid gap-3">
            <Field label="Summary">
              <TextArea
                value={draft.summary}
                onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
                className="min-h-28"
                autoFocus
              />
            </Field>
            <Field label="What they do">
              <TextArea
                value={draft.what_they_do}
                onChange={(e) => setDraft((d) => ({ ...d, what_they_do: e.target.value }))}
                className="min-h-28"
              />
            </Field>
            <p className="text-sm text-[var(--muted)]">
              Discard closes without changing the kit. Apply updates the draft — use header Save to
              persist.
            </p>
          </div>
        </ModalShell>
      ) : null}
    </section>
  );
}
