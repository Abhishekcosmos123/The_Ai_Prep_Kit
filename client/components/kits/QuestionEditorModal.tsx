"use client";

import { useState } from "react";
import type { Question, Requirement } from "@/types/kit";
import { Field, TextArea, TextInput } from "@/components/ui/primitives";
import { IconSave } from "@/components/ui/Icons";
import { ModalShell } from "@/components/ui/ModalShell";
import { RequirementChecklist, toggleId } from "@/components/kits/RequirementChecklist";

export type QuestionDraft = {
  category: string;
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
  requirement_ids: string[];
  pinned: boolean;
};

const emptyDraft = (requirements: Requirement[]): QuestionDraft => ({
  category: "technical",
  prompt: "",
  answer_outline: "",
  difficulty: 2,
  requirement_ids: requirements[0] ? [requirements[0].id] : [],
  pinned: false,
});

function fromQuestion(q: Question): QuestionDraft {
  return {
    category: q.category,
    prompt: q.prompt,
    answer_outline: q.answer_outline,
    difficulty: q.difficulty,
    requirement_ids: [...q.requirement_ids],
    pinned: !!q.pinned,
  };
}

function validate(draft: QuestionDraft): string | null {
  if (!draft.category.trim()) return "Category is required.";
  if (draft.prompt.trim().length < 8) return "Prompt must be at least 8 characters.";
  if (draft.answer_outline.trim().length < 8) {
    return "Answer outline must be at least 8 characters.";
  }
  if (![1, 2, 3].includes(draft.difficulty)) return "Pick a difficulty.";
  return null;
}

export function QuestionEditorModal({
  mode,
  initial,
  requirements,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  initial?: Question | null;
  requirements: Requirement[];
  onClose: () => void;
  onSave: (draft: QuestionDraft) => void;
}) {
  const [draft, setDraft] = useState<QuestionDraft>(() =>
    initial ? fromQuestion(initial) : emptyDraft(requirements)
  );
  const [error, setError] = useState("");

  function submit() {
    const msg = validate(draft);
    if (msg) {
      setError(msg);
      return;
    }
    onSave({
      ...draft,
      category: draft.category.trim(),
      prompt: draft.prompt.trim(),
      answer_outline: draft.answer_outline.trim(),
    });
  }

  return (
    <ModalShell
      eyebrow={mode === "add" ? "New question" : "Edit question"}
      title={mode === "add" ? "Add to question bank" : "Update question"}
      titleId="question-modal-title"
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
            {mode === "add" ? "Save question" : "Save changes"}
          </button>
        </div>
      }
    >
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Category">
            <TextInput
              value={draft.category}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              placeholder="technical"
            />
          </Field>
          <Field label="Difficulty">
            <select
              className="ui-input"
              value={draft.difficulty}
              onChange={(e) =>
                setDraft((d) => ({ ...d, difficulty: Number(e.target.value) as 1 | 2 | 3 }))
              }
            >
              <option value={1}>1 · Easy</option>
              <option value={2}>2 · Medium</option>
              <option value={3}>3 · Hard</option>
            </select>
          </Field>
        </div>
        <Field label="Prompt">
          <TextArea
            value={draft.prompt}
            onChange={(e) => setDraft((d) => ({ ...d, prompt: e.target.value }))}
            placeholder="Interview question…"
            className="min-h-28"
          />
        </Field>
        <Field label="Answer outline">
          <TextArea
            value={draft.answer_outline}
            onChange={(e) => setDraft((d) => ({ ...d, answer_outline: e.target.value }))}
            placeholder="Key points to cover…"
            className="min-h-28"
          />
        </Field>
        <RequirementChecklist
          requirements={requirements}
          selectedIds={draft.requirement_ids}
          onToggle={(id) =>
            setDraft((d) => ({ ...d, requirement_ids: toggleId(d.requirement_ids, id) }))
          }
        />
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.pinned}
            onChange={(e) => setDraft((d) => ({ ...d, pinned: e.target.checked }))}
          />
          Pin (keep through regeneration)
        </label>
      </div>
      {error ? <p className="text-sm text-[var(--warn)]">{error}</p> : null}
    </ModalShell>
  );
}
