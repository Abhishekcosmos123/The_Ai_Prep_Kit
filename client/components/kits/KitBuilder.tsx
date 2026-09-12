"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { Flashcard, InterviewKit, Question } from "@/types/kit";
import { IconClose, IconEdit, IconRefresh, IconSave } from "@/components/ui/Icons";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { BriefPanel } from "@/components/kits/BriefPanel";
import { FlashcardsPanel } from "@/components/kits/FlashcardsPanel";
import { KitDetailsEditorModal } from "@/components/kits/KitDetailsEditorModal";
import { KitTabs, type KitTabId } from "@/components/kits/KitTabs";
import { OverviewPanel } from "@/components/kits/OverviewPanel";
import { QuestionsPanel } from "@/components/kits/QuestionsPanel";
import { SchedulePanel } from "@/components/kits/SchedulePanel";
import { displayCompany, displayMeta, isPlaceholderMeta } from "@/lib/metaDisplay";
import { withPinnedFirst } from "@/lib/kitOrder";

const REGEN: Record<string, string> = {
  "company-brief": "Replaces the company brief and sources only.",
  questions: "Keeps pinned, edited, and user-added questions.",
  schedule: "Rebuilds the day plan from current questions.",
};

function withResolvedMeta(kit: InterviewKit): InterviewKit {
  const company = displayCompany(kit);
  const seniority = displayMeta(kit.role.seniority);
  const location = displayMeta(kit.source.location);
  const title = displayMeta(kit.role.title, "Role");
  return {
    ...kit,
    source: {
      ...kit.source,
      company,
      role: title,
      location,
    },
    role: {
      ...kit.role,
      title,
      seniority,
    },
    questions: withPinnedFirst(kit.questions),
  };
}

function cloneKit(kit: InterviewKit): InterviewKit {
  return structuredClone(kit);
}

export function KitBuilder({
  kitId,
  initialKit,
  onSaved,
}: {
  kitId: string;
  initialKit: InterviewKit;
  onSaved?: (kit: InterviewKit) => void;
}) {
  const [kit, setKit] = useState(() => cloneKit(withResolvedMeta(initialKit)));
  const [baseline, setBaseline] = useState(() => cloneKit(withResolvedMeta(initialKit)));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(
    isPlaceholderMeta(initialKit.source.company)
      ? "Company name was missing — filled from the website. Edit details if needed, then Save."
      : ""
  );
  const [busy, setBusy] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [tab, setTab] = useState<KitTabId>("overview");
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (regenOpen && event.target instanceof Node && !((event.target as HTMLElement).closest?.(".ui-modal-card"))) {
        setRegenOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [regenOpen]);

  const uncovered = useMemo(
    () => new Set(kit.coverage.uncovered_requirement_ids),
    [kit.coverage.uncovered_requirement_ids]
  );
  const categories = useMemo(() => {
    const set = new Set([
      "technical",
      "behavioural",
      "system-design",
      "company-fit",
      ...kit.questions.map((q) => q.category),
    ]);
    return [...set].filter(Boolean).sort();
  }, [kit.questions]);

  const update = (next: InterviewKit, statusMessage = "") => {
    setKit({
      ...next,
      questions: withPinnedFirst(next.questions),
    });
    setDirty(true);
    setMessage(statusMessage);
  };

  function discardChanges() {
    setKit(cloneKit(baseline));
    setDirty(false);
    setMessage("Local changes discarded");
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const payload = withResolvedMeta(kit);
      const data = await api<{ kit: { kit: InterviewKit } }>(`/api/kits/${kitId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const saved = data.kit?.kit ? withResolvedMeta(data.kit.kit) : payload;
      setKit(cloneKit(saved));
      setBaseline(cloneKit(saved));
      onSaved?.(data.kit?.kit ?? payload);
      setDirty(false);
      setMessage("All changes saved");
      return true;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function regenerate(kind: "company-brief" | "questions" | "schedule", category?: string) {
    const hint = category
      ? `Regenerate only "${category}". Pinned, edited, and user-added questions are kept.`
      : REGEN[kind];
    const labels: Record<string, string> = {
      "company-brief": "company brief",
      questions: "questions",
      schedule: "schedule",
    };
    const ok = await confirm({
      eyebrow: "Regenerate",
      title: category
        ? `Regenerate ${category} questions?`
        : `Regenerate ${labels[kind]}?`,
      body: [
        hint,
        "Other sections stay as they are. Pinned, edited, and hand-added questions are kept.",
        dirty
          ? "You have unsaved local edits — save or discard first if you want those included; regeneration loads the last saved kit."
          : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
      confirmLabel: "Regenerate",
    });
    if (!ok) return;
    setBusy(category ? `questions:${category}` : kind);
    setMessage("");
    try {
      const path =
        kind === "questions"
          ? `/api/kits/${kitId}/regenerate/questions`
          : `/api/kits/${kitId}/regenerate/${kind}`;
      const data = await api<{ kit: { kit: InterviewKit } }>(path, {
        method: "POST",
        body: JSON.stringify(category ? { category } : {}),
      });
      if (data.kit.kit) {
        const next = withResolvedMeta(data.kit.kit);
        setKit(cloneKit(next));
        setBaseline(cloneKit(next));
        onSaved?.(data.kit.kit);
        setDirty(false);
        setMessage(category ? `"${category}" regenerated` : `${kind} regenerated`);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setBusy("");
    }
  }

  const metaLine = [kit.role.title, kit.role.seniority, kit.source.location]
    .map((v) => displayMeta(v))
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <header className="kit-toolbar border-b border-[var(--line)] pb-5">
        <div className="kit-toolbar-actions">
          <div className="relative">
            <button
              type="button"
              className="ui-icon-btn"
              disabled={!!busy}
              aria-expanded={regenOpen}
              title={busy ? "Working…" : "Regenerate"}
              aria-label={busy ? "Working" : "Regenerate"}
              onClick={() => setRegenOpen((v) => !v)}
            >
              <IconRefresh className={busy ? "animate-spin" : undefined} />
            </button>
            {regenOpen ? (
              <div className="absolute right-0 z-30 mt-2 min-w-[12rem] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] py-1 shadow-[var(--shadow)]">
                {(
                  [
                    ["company-brief", "Company brief"],
                    ["questions", "Questions"],
                    ["schedule", "Schedule"],
                  ] as const
                ).map(([kind, label]) => (
                  <button
                    key={kind}
                    type="button"
                    disabled={!!busy}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--wash)] disabled:opacity-50"
                    title={REGEN[kind]}
                    onClick={() => {
                      setRegenOpen(false);
                      void regenerate(kind);
                    }}
                  >
                    {busy === kind ? "Working…" : label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {dirty ? (
            <>
              <button
                type="button"
                className="ui-btn ui-btn-ghost !text-sm inline-flex items-center gap-2"
                disabled={saving}
                onClick={() => void discardChanges()}
                title="Discard unsaved changes"
              >
                <IconClose size={16} />
                Discard
              </button>
              <button
                type="button"
                disabled={saving}
                className="ui-btn ui-btn-primary !text-sm inline-flex items-center gap-2"
                onClick={() => void save()}
              >
                <IconSave size={16} />
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="ui-icon-btn"
            title="Edit company & role"
            aria-label="Edit company and role"
            onClick={() => setDetailsOpen(true)}
          >
            <IconEdit />
          </button>
        </div>

        <div className={`min-w-0 ${dirty ? "kit-toolbar-main is-dirty" : "kit-toolbar-main"}`}>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {kit.source.company || "Untitled kit"}
            </h1>
            {metaLine ? (
              <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">{metaLine}</p>
            ) : null}
            {dirty ? (
              <p className="mt-2 text-sm font-medium text-[var(--warn)]">Unsaved changes</p>
            ) : null}
          </div>
        </div>
        {message ? (
          <p className="mt-3 text-sm text-[var(--muted)]" role="status">
            {message}
          </p>
        ) : null}
      </header>

      <KitTabs
        active={tab}
        onChange={setTab}
        questionCount={kit.questions.length}
        flashcardCount={kit.flashcards.length}
      />

      {tab === "overview" ? <OverviewPanel kit={kit} uncoveredIds={uncovered} /> : null}

      {tab === "brief" ? (
        <BriefPanel
          kit={kit}
          onSaveBrief={(patch) =>
            update(
              {
                ...kit,
                company_brief: { ...kit.company_brief, ...patch },
              },
              "Brief updated — use Save in the header to persist the kit."
            )
          }
        />
      ) : null}

      {tab === "questions" ? (
        <QuestionsPanel
          questions={kit.questions}
          requirements={kit.role.requirements}
          categories={categories}
          busy={busy}
          onChangeQuestions={(next: Question[], statusMessage?: string) =>
            update({ ...kit, questions: next }, statusMessage)
          }
          onRegenCategory={(category) => void regenerate("questions", category)}
        />
      ) : null}

      {tab === "flashcards" ? (
        <FlashcardsPanel
          flashcards={kit.flashcards}
          requirements={kit.role.requirements}
          onChangeFlashcards={(next: Flashcard[], statusMessage?: string) =>
            update({ ...kit, flashcards: next }, statusMessage)
          }
        />
      ) : null}

      {tab === "schedule" ? <SchedulePanel kit={kit} /> : null}

      {detailsOpen ? (
        <KitDetailsEditorModal
          kit={kit}
          onClose={() => setDetailsOpen(false)}
          onSave={(draft) => {
            update(
              {
                ...kit,
                source: {
                  ...kit.source,
                  company: draft.company,
                  role: draft.role,
                  location: draft.location,
                },
                role: {
                  ...kit.role,
                  title: draft.role,
                  seniority: draft.seniority,
                },
              },
              "Details updated — use Save in the header to persist the kit."
            );
            setDetailsOpen(false);
          }}
        />
      ) : null}

      {confirmDialog}
    </div>
  );
}
