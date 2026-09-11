"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Flashcard, InterviewKit, Question } from "@/types/kit";
import { Field, TextInput } from "@/components/ui/primitives";
import { IconEdit } from "@/components/ui/Icons";
import { BriefPanel } from "@/components/kits/BriefPanel";
import { FlashcardsPanel } from "@/components/kits/FlashcardsPanel";
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

export function KitBuilder({
  kitId,
  initialKit,
  onSaved,
  practiceHref,
}: {
  kitId: string;
  initialKit: InterviewKit;
  onSaved?: (kit: InterviewKit) => void;
  practiceHref?: string;
}) {
  const [kit, setKit] = useState(() => withResolvedMeta(initialKit));
  const [dirty, setDirty] = useState(() => isPlaceholderMeta(initialKit.source.company));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(
    isPlaceholderMeta(initialKit.source.company)
      ? "Company name was missing — filled from the website. Use the pencil, then save."
      : ""
  );
  const [busy, setBusy] = useState("");
  const [editingMeta, setEditingMeta] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [tab, setTab] = useState<KitTabId>("overview");
  const [editingBrief, setEditingBrief] = useState(false);

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

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const payload = withResolvedMeta(kit);
      const data = await api<{ kit: { kit: InterviewKit } }>(`/api/kits/${kitId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (data.kit?.kit) {
        setKit(withResolvedMeta(data.kit.kit));
        onSaved?.(data.kit.kit);
      } else {
        setKit(payload);
        onSaved?.(payload);
      }
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
      ? `Regenerate only "${category}". Pinned/edited/user questions are kept.`
      : REGEN[kind];
    if (!confirm(`${hint}\n\nContinue?`)) return;
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
        setKit(withResolvedMeta(data.kit.kit));
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

  function patchDay(dayNum: number, patch: { focus?: string; minutes?: number }) {
    update({
      ...kit,
      schedule: {
        ...kit.schedule,
        days: kit.schedule.days.map((d) =>
          d.day === dayNum
            ? {
                ...d,
                ...(patch.focus != null ? { focus: patch.focus } : {}),
                ...(patch.minutes != null
                  ? { minutes: Math.max(1, Math.floor(patch.minutes) || d.minutes) }
                  : {}),
              }
            : d
        ),
      },
    });
  }

  const metaLine = [kit.role.title, kit.role.seniority, kit.source.location]
    .map((v) => displayMeta(v))
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <header className="kit-toolbar border-b border-[var(--line)] pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {editingMeta ? (
              <div className="max-w-2xl space-y-3">
                <Field label="Company">
                  <TextInput
                    value={kit.source.company}
                    onChange={(e) =>
                      update({
                        ...kit,
                        source: { ...kit.source, company: e.target.value },
                      })
                    }
                    className="!text-xl !font-bold font-display"
                  />
                </Field>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Field label="Role">
                    <TextInput
                      value={kit.role.title}
                      onChange={(e) =>
                        update({
                          ...kit,
                          role: { ...kit.role, title: e.target.value },
                          source: { ...kit.source, role: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field label="Seniority">
                    <TextInput
                      value={kit.role.seniority}
                      placeholder="e.g. Senior"
                      onChange={(e) =>
                        update({ ...kit, role: { ...kit.role, seniority: e.target.value } })
                      }
                    />
                  </Field>
                  <Field label="Location">
                    <TextInput
                      value={kit.source.location}
                      onChange={(e) =>
                        update({
                          ...kit,
                          source: { ...kit.source, location: e.target.value },
                        })
                      }
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="ui-btn ui-btn-primary !text-sm"
                    disabled={saving || !dirty}
                    onClick={() => {
                      void (async () => {
                        const ok = await save();
                        if (ok) setEditingMeta(false);
                      })();
                    }}
                  >
                    {saving ? "Saving…" : "Save details"}
                  </button>
                  <button
                    type="button"
                    className="ui-btn ui-btn-ghost !text-sm"
                    onClick={() => setEditingMeta(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
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
            )}
          </div>

          {!editingMeta ? (
            <div className="relative flex flex-wrap items-center gap-2">
              {practiceHref ? (
                <Link href={practiceHref} className="ui-btn ui-btn-secondary !text-sm">
                  Practice
                </Link>
              ) : null}
              <button
                type="button"
                className="ui-icon-btn"
                title="Edit company & role"
                aria-label="Edit company and role"
                onClick={() => setEditingMeta(true)}
              >
                <IconEdit />
              </button>
              <div className="relative">
                <button
                  type="button"
                  className="ui-btn ui-btn-ghost !text-sm"
                  disabled={!!busy}
                  aria-expanded={regenOpen}
                  onClick={() => setRegenOpen((v) => !v)}
                >
                  {busy ? "Working…" : "Regenerate"}
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
              <button
                type="button"
                disabled={saving || !dirty}
                className="ui-btn ui-btn-primary !text-sm"
                onClick={() => void save()}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          ) : null}
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
          editing={editingBrief}
          onToggleEditing={() => setEditingBrief((v) => !v)}
          onChangeBrief={(patch) =>
            update({
              ...kit,
              company_brief: { ...kit.company_brief, ...patch },
            })
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

      {tab === "schedule" ? <SchedulePanel kit={kit} onPatchDay={patchDay} /> : null}
    </div>
  );
}
