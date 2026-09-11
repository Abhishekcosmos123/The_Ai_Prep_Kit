"use client";

import { useState } from "react";
import type { Flashcard, Requirement } from "@/types/kit";
import { Field, TextArea } from "@/components/ui/primitives";
import { IconSave } from "@/components/ui/Icons";
import { ModalShell } from "@/components/ui/ModalShell";
import { RequirementChecklist, toggleId } from "@/components/kits/RequirementChecklist";

export type FlashcardDraft = {
  front: string;
  back: string;
  requirement_ids: string[];
};

function validate(draft: FlashcardDraft): string | null {
  if (draft.front.trim().length < 3) return "Front needs at least 3 characters.";
  if (draft.back.trim().length < 3) return "Back needs at least 3 characters.";
  return null;
}

export function FlashcardEditorModal({
  mode,
  initial,
  requirements,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  initial?: Flashcard | null;
  requirements: Requirement[];
  onClose: () => void;
  onSave: (draft: FlashcardDraft) => void;
}) {
  const [draft, setDraft] = useState<FlashcardDraft>(() => ({
    front: initial?.front ?? "",
    back: initial?.back ?? "",
    requirement_ids: initial?.requirement_ids ? [...initial.requirement_ids] : [],
  }));
  const [error, setError] = useState("");

  function submit() {
    const msg = validate(draft);
    if (msg) {
      setError(msg);
      return;
    }
    onSave({
      front: draft.front.trim(),
      back: draft.back.trim(),
      requirement_ids: draft.requirement_ids,
    });
  }

  return (
    <ModalShell
      eyebrow={mode === "add" ? "New flashcard" : "Edit flashcard"}
      title={mode === "add" ? "Add flashcard" : "Update flashcard"}
      titleId="flashcard-modal-title"
      wide
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-primary inline-flex items-center gap-2"
            onClick={submit}
          >
            <IconSave size={16} />
            {mode === "add" ? "Save flashcard" : "Save changes"}
          </button>
        </div>
      }
    >
      <div className="grid gap-3">
        <Field label="Front">
          <TextArea
            value={draft.front}
            onChange={(e) => setDraft((d) => ({ ...d, front: e.target.value }))}
            placeholder="Prompt or term…"
            className="min-h-24"
          />
        </Field>
        <Field label="Back">
          <TextArea
            value={draft.back}
            onChange={(e) => setDraft((d) => ({ ...d, back: e.target.value }))}
            placeholder="Answer or definition…"
            className="min-h-24"
          />
        </Field>
        {requirements.length ? (
          <RequirementChecklist
            requirements={requirements}
            selectedIds={draft.requirement_ids}
            onToggle={(id) =>
              setDraft((d) => ({ ...d, requirement_ids: toggleId(d.requirement_ids, id) }))
            }
            maxHeightClass="max-h-36"
          />
        ) : null}
      </div>
      {error ? <p className="text-sm text-[var(--warn)]">{error}</p> : null}
    </ModalShell>
  );
}
