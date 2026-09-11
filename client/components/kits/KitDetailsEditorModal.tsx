"use client";

import { useState } from "react";
import type { InterviewKit } from "@/types/kit";
import { Field, TextInput } from "@/components/ui/primitives";
import { IconSave } from "@/components/ui/Icons";
import { ModalShell } from "@/components/ui/ModalShell";

export type KitDetailsDraft = {
  company: string;
  role: string;
  seniority: string;
  location: string;
};

export function KitDetailsEditorModal({
  kit,
  onClose,
  onSave,
}: {
  kit: InterviewKit;
  onClose: () => void;
  onSave: (draft: KitDetailsDraft) => void;
}) {
  const [draft, setDraft] = useState<KitDetailsDraft>({
    company: kit.source.company || "",
    role: kit.role.title || "",
    seniority: kit.role.seniority || "",
    location: kit.source.location || "",
  });
  const [error, setError] = useState("");

  function submit() {
    if (!draft.company.trim()) {
      setError("Company name is required.");
      return;
    }
    onSave({
      company: draft.company.trim(),
      role: draft.role.trim(),
      seniority: draft.seniority.trim(),
      location: draft.location.trim(),
    });
  }

  return (
    <ModalShell
      eyebrow="Kit details"
      title="Edit company & role"
      titleId="kit-details-modal-title"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>
            Discard
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-primary inline-flex items-center gap-2"
            onClick={submit}
          >
            <IconSave size={16} />
            Apply changes
          </button>
        </div>
      }
    >
      <div className="grid gap-3">
        <Field label="Company">
          <TextInput
            value={draft.company}
            onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))}
            className="!text-lg !font-bold font-display"
            autoFocus
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Role">
            <TextInput
              value={draft.role}
              onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
            />
          </Field>
          <Field label="Seniority">
            <TextInput
              value={draft.seniority}
              placeholder="e.g. Senior"
              onChange={(e) => setDraft((d) => ({ ...d, seniority: e.target.value }))}
            />
          </Field>
          <Field label="Location">
            <TextInput
              value={draft.location}
              onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
            />
          </Field>
        </div>
        {error ? <p className="text-sm text-[var(--warn)]">{error}</p> : null}
        <p className="text-sm text-[var(--muted)]">
          Apply updates this kit draft. Use Save in the header to persist to the server.
        </p>
      </div>
    </ModalShell>
  );
}
