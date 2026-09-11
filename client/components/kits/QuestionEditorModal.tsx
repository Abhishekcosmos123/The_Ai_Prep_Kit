"use client";

import { useMemo, useState } from "react";
import type { Question, Requirement } from "@/types/kit";
import { Field, TextArea } from "@/components/ui/primitives";
import { IconRefresh, IconSave } from "@/components/ui/Icons";
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

const emptyDraft = (requirements: Requirement[], categories: string[]): QuestionDraft => ({
  category: categories[0] || "technical",
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
  categories,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  initial?: Question | null;
  requirements: Requirement[];
  categories: string[];
  onClose: () => void;
  onSave: (draft: QuestionDraft) => void;
}) {
  const [draft, setDraft] = useState<QuestionDraft>(() =>
    initial ? fromQuestion(initial) : emptyDraft(requirements, categories)
  );
  const [error, setError] = useState("");

  const categoryOptions = useMemo(() => {
    const set = new Set(categories.filter(Boolean));
    if (draft.category.trim()) set.add(draft.category.trim());
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [categories, draft.category]);

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

  function patch<K extends keyof QuestionDraft>(key: K, value: QuestionDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
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
          <Field
            label="Category"
            htmlFor="question-category"
            badge={
              <span
                className="ui-badge ui-badge-accent !gap-1"
                title="Use Regen on the Questions tab to rebuild every question in a category"
              >
                <IconRefresh size={11} />
                Regenerable
              </span>
            }
            hint={
              <>
                Move this question to another category, or use{" "}
                <span className="font-semibold text-[var(--ink)]">Regen</span> on the Questions tab
                to rebuild a whole category.
              </>
            }
          >
            <select
              id="question-category"
              className="ui-input"
              value={draft.category}
              onChange={(e) => patch("category", e.target.value)}
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Difficulty">
            <select
              className="ui-input"
              value={draft.difficulty}
              onChange={(e) => patch("difficulty", Number(e.target.value) as 1 | 2 | 3)}
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
            onChange={(e) => patch("prompt", e.target.value)}
            placeholder="Interview question…"
            className="min-h-28"
          />
        </Field>
        <Field label="Answer outline">
          <TextArea
            value={draft.answer_outline}
            onChange={(e) => patch("answer_outline", e.target.value)}
            placeholder="Key points to cover…"
            className="min-h-28"
          />
        </Field>
        <RequirementChecklist
          requirements={requirements}
          selectedIds={draft.requirement_ids}
          onToggle={(id) => patch("requirement_ids", toggleId(draft.requirement_ids, id))}
        />
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.pinned}
            onChange={(e) => patch("pinned", e.target.checked)}
          />
          Pin (keep through regeneration)
        </label>
      </div>
      {error ? <p className="text-sm text-[var(--warn)]">{error}</p> : null}
    </ModalShell>
  );
}
