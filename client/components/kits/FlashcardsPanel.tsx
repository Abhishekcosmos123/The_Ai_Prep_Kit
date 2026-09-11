"use client";

import { useState } from "react";
import type { Flashcard, Requirement } from "@/types/kit";
import { IconEdit, IconTrash } from "@/components/ui/Icons";
import { FlashcardEditorModal, type FlashcardDraft } from "@/components/kits/FlashcardEditorModal";

export function FlashcardsPanel({
  flashcards,
  requirements,
  onChangeFlashcards,
}: {
  flashcards: Flashcard[];
  requirements: Requirement[];
  onChangeFlashcards: (next: Flashcard[], message?: string) => void;
}) {
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<null | { mode: "add" } | { mode: "edit"; card: Flashcard }>(
    null
  );

  function saveDraft(draft: FlashcardDraft) {
    if (modal?.mode === "edit") {
      const id = modal.card.id;
      onChangeFlashcards(
        flashcards.map((f) =>
          f.id === id
            ? { ...f, ...draft, state: f.state === "user" ? "user" : "edited" }
            : f
        ),
        "Flashcard updated — save the kit to keep it."
      );
    } else {
      onChangeFlashcards(
        [...flashcards, { id: `f_user_${Date.now()}`, ...draft, state: "user" }],
        "Flashcard added — save the kit to keep it."
      );
    }
    setModal(null);
  }

  return (
    <section className="space-y-5 ui-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Flashcards</h2>
          <p className="text-sm text-[var(--muted)]">Click a card to flip. Edit opens a form.</p>
        </div>
        <button
          type="button"
          className="ui-btn ui-btn-primary !text-sm"
          onClick={() => setModal({ mode: "add" })}
        >
          Add flashcard
        </button>
      </div>
      <div className="flash-grid">
        {flashcards.map((f) => {
          const showBack = !!flipped[f.id];
          return (
            <article key={f.id} className="flash-card">
              <div className="flash-card-toolbar">
                <span className="ui-badge ui-badge-neutral">{f.state || "generated"}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="ui-icon-btn"
                    title="Edit flashcard"
                    aria-label="Edit flashcard"
                    onClick={() => setModal({ mode: "edit", card: f })}
                  >
                    <IconEdit />
                  </button>
                  <button
                    type="button"
                    className="ui-icon-btn ui-icon-btn-danger"
                    title="Delete flashcard"
                    aria-label="Delete flashcard"
                    onClick={() => {
                      if (!confirm("Delete this flashcard?")) return;
                      onChangeFlashcards(flashcards.filter((x) => x.id !== f.id));
                    }}
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>
              <button
                type="button"
                className={`flash-flip ${showBack ? "is-flipped" : ""}`}
                aria-pressed={showBack}
                aria-label={showBack ? "Show front of card" : "Show back of card"}
                onClick={() => setFlipped((prev) => ({ ...prev, [f.id]: !prev[f.id] }))}
              >
                <span className="flash-flip-inner">
                  <span className="flash-face flash-face-front">
                    <span className="flash-face-label">Front</span>
                    <span className="flash-face-text">{f.front}</span>
                    <span className="flash-face-hint">Click to flip</span>
                  </span>
                  <span className="flash-face flash-face-back">
                    <span className="flash-face-label">Back</span>
                    <span className="flash-face-text">{f.back}</span>
                    <span className="flash-face-hint">Click to flip</span>
                  </span>
                </span>
              </button>
            </article>
          );
        })}
      </div>
      {!flashcards.length ? (
        <p className="py-10 text-center text-sm text-[var(--muted)]">No flashcards yet.</p>
      ) : null}

      {modal ? (
        <FlashcardEditorModal
          mode={modal.mode}
          initial={modal.mode === "edit" ? modal.card : null}
          requirements={requirements}
          onClose={() => setModal(null)}
          onSave={saveDraft}
        />
      ) : null}
    </section>
  );
}
