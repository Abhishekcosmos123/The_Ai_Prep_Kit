"use client";

export type KitTabId = "overview" | "brief" | "questions" | "flashcards" | "schedule";

const TABS: { id: KitTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "brief", label: "Company" },
  { id: "questions", label: "Questions" },
  { id: "flashcards", label: "Flashcards" },
  { id: "schedule", label: "Schedule" },
];

export function KitTabs({
  active,
  onChange,
  questionCount,
  flashcardCount,
}: {
  active: KitTabId;
  onChange: (id: KitTabId) => void;
  questionCount: number;
  flashcardCount: number;
}) {
  return (
    <nav className="kit-tabs" aria-label="Kit sections">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`kit-tab ${active === t.id ? "is-active" : ""}`}
        >
          {t.label}
          {t.id === "questions" ? <span className="kit-tab-count">{questionCount}</span> : null}
          {t.id === "flashcards" ? <span className="kit-tab-count">{flashcardCount}</span> : null}
        </button>
      ))}
    </nav>
  );
}
