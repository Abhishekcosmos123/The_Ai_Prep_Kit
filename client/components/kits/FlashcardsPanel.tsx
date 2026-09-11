"use client";

import { useMemo, useState } from "react";
import type { Flashcard, Requirement } from "@/types/kit";
import { IconEdit, IconTrash } from "@/components/ui/Icons";
import { FlashcardEditorModal, type FlashcardDraft } from "@/components/kits/FlashcardEditorModal";
import { byId } from "@/lib/kitOrder";

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
  const reqById = useMemo(() => byId(requirements), [requirements]);

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
          const covers = f.requirement_ids
            .map((id) => reqById.get(id)?.text)
            .filter(Boolean)
            .slice(0, 1)
            .join("");
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
                className={`flash-face ${showBack ? "is-back" : ""}`}
                onClick={() => setFlipped((prev) => ({ ...prev, [f.id]: !prev[f.id] }))}
              >
                <span className="flash-face-label">{showBack ? "Back" : "Front"}</span>
                <p className="flash-face-text">{showBack ? f.back : f.front}</p>
                <span className="flash-face-hint">Click to flip</span>
              </button>
              {covers ? <p className="flash-covers">Covers · {covers}</p> : null}
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
