"use client";

import { useMemo, useState } from "react";
import type { Question, Requirement } from "@/types/kit";
import { IconDown, IconEdit, IconPin, IconTrash } from "@/components/ui/Icons";
import { QuestionEditorModal, type QuestionDraft } from "@/components/kits/QuestionEditorModal";
import { useLongPressReorder } from "@/hooks/useLongPressReorder";
import { byId, reorderList } from "@/lib/kitOrder";

const DIFF = ["", "Easy", "Medium", "Hard"];

export function QuestionsPanel({
  questions,
  requirements,
  categories,
  busy,
  onChangeQuestions,
  onRegenCategory,
}: {
  questions: Question[];
  requirements: Requirement[];
  categories: string[];
  busy: string;
  onChangeQuestions: (next: Question[], message?: string) => void;
  onRegenCategory: (category: string) => void;
}) {
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [modal, setModal] = useState<null | { mode: "add" } | { mode: "edit"; question: Question }>(
    null
  );
  const reqById = useMemo(() => byId(requirements), [requirements]);

  const reorderItems = useMemo(
    () => questions.map((q) => ({ id: q.id, label: q.prompt })),
    [questions]
  );

  const { dragFrom, dragOverIdx, isReordering, bindItem, ghost } = useLongPressReorder({
    items: reorderItems,
    onReorder: (from, to) => {
      onChangeQuestions(reorderList(questions, from, to));
    },
  });

  function patchQuestion(id: string, patch: Partial<Question>) {
    onChangeQuestions(
      questions.map((q) =>
        q.id === id ? { ...q, ...patch, state: q.state === "user" ? "user" : "edited" } : q
      )
    );
  }

  function saveDraft(draft: QuestionDraft) {
    if (modal?.mode === "edit") {
      const id = modal.question.id;
      onChangeQuestions(
        questions.map((q) =>
          q.id === id
            ? { ...q, ...draft, state: q.state === "user" ? "user" : "edited" }
            : q
        ),
        "Question updated — save the kit to keep it."
      );
    } else {
      const q: Question = { id: `q_user_${Date.now()}`, ...draft, state: "user" };
      onChangeQuestions([...questions, q], "Question added — save the kit to keep it.");
      setExpandedQ(q.id);
    }
    setModal(null);
  }

  return (
    <section className="space-y-5 ui-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Question bank</h2>
          <p className="text-sm text-[var(--muted)]">
            Long-press anywhere on a card, then drag to reorder. Expand for details.
          </p>
        </div>
        <button
          type="button"
          className="ui-btn ui-btn-primary !text-sm"
          onClick={() => setModal({ mode: "add" })}
        >
          Add question
        </button>
      </div>

      {categories.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
          <span className="text-xs font-bold uppercase tracking-[0.12em]">Regen</span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              disabled={!!busy}
              className="underline-offset-2 hover:text-[var(--ink)] hover:underline disabled:opacity-50"
              onClick={() => onRegenCategory(cat)}
            >
              {busy === `questions:${cat}` ? "…" : cat}
            </button>
          ))}
        </div>
      ) : null}

      <div className={`q-list ${isReordering ? "is-reordering" : ""}`}>
        {questions.map((q, index) => {
          const open = expandedQ === q.id;
          const linked = q.requirement_ids
            .map((id) => reqById.get(id))
            .filter(Boolean) as Requirement[];
          const isDragging = dragFrom === index;
          const isDropTarget = dragFrom != null && dragOverIdx === index && dragFrom !== index;
          const bind = bindItem(index);
          return (
            <article
              key={q.id}
              {...bind}
              className={`q-card ${open ? "is-open" : ""} ${isDragging ? "is-dragging" : ""} ${isDropTarget ? "is-drop-target" : ""}`}
            >
              <div className="q-card-main">
                <div className="q-card-body min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    <span className="ui-badge ui-badge-neutral">{q.category}</span>
                    <span className="ui-badge ui-badge-info">{DIFF[q.difficulty]}</span>
                    {q.pinned ? <span className="ui-badge ui-badge-accent">Pinned</span> : null}
                  </div>
                  <p className="font-medium leading-snug text-[var(--ink)]">{q.prompt}</p>
                  {isDragging ? (
                    <p className="q-dragging-label">Dragging… drop on another card</p>
                  ) : null}
                </div>
                <div className="q-card-actions">
                  <button
                    type="button"
                    className={`ui-icon-btn ${q.pinned ? "ui-icon-btn-primary" : ""}`}
                    title={q.pinned ? "Unpin" : "Pin"}
                    aria-label={q.pinned ? "Unpin" : "Pin"}
                    onClick={() => patchQuestion(q.id, { pinned: !q.pinned })}
                  >
                    <IconPin />
                  </button>
                  <button
                    type="button"
                    className="ui-icon-btn"
                    title="Edit question"
                    aria-label="Edit question"
                    onClick={() => setModal({ mode: "edit", question: q })}
                  >
                    <IconEdit />
                  </button>
                  <button
                    type="button"
                    className="ui-icon-btn ui-icon-btn-danger"
                    title="Delete question"
                    aria-label="Delete question"
                    onClick={() => {
                      if (!confirm("Delete this question?")) return;
                      onChangeQuestions(questions.filter((x) => x.id !== q.id));
                    }}
                  >
                    <IconTrash />
                  </button>
                  <button
                    type="button"
                    className={`ui-icon-btn q-expand-btn ${open ? "is-open" : ""}`}
                    title={open ? "Collapse" : "Expand"}
                    aria-label={open ? "Collapse question" : "Expand question"}
                    aria-expanded={open}
                    onClick={() => setExpandedQ(open ? null : q.id)}
                  >
                    <IconDown />
                  </button>
                </div>
              </div>
              {open && !isDragging ? (
                <div className="q-detail">
                  <strong>Answer outline</strong>
                  <p className="whitespace-pre-wrap">{q.answer_outline}</p>
                  <strong className="mt-4">Linked requirements</strong>
                  {linked.length ? (
                    <ul className="q-links">
                      {linked.map((r) => (
                        <li key={r.id}>
                          <span>{r.priority}</span>
                          {r.text}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>None linked.</p>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
        {!questions.length ? (
          <p className="py-10 text-center text-sm text-[var(--muted)]">
            No questions yet. Use Add question to create one.
          </p>
        ) : null}
      </div>

      {ghost}

      {modal ? (
        <QuestionEditorModal
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.question : null}
          requirements={requirements}
          onClose={() => setModal(null)}
          onSave={saveDraft}
        />
      ) : null}
    </section>
  );
}
