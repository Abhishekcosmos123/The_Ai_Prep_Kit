"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { InterviewKit, Question, Flashcard, Requirement } from "@/types/kit";
import { CoverageMeter } from "@/components/ui/primitives";

type TabId = "overview" | "brief" | "questions" | "flashcards" | "schedule";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "brief", label: "Company" },
  { id: "questions", label: "Questions" },
  { id: "flashcards", label: "Flashcards" },
  { id: "schedule", label: "Schedule" },
];

const REGEN_HINTS: Record<string, string> = {
  "company-brief": "Replaces the company brief and sources only.",
  questions: "Keeps pinned, edited, and user-added questions; regenerates the rest.",
  schedule: "Rebuilds the day plan from your current question list.",
};

function difficultyLabel(d: number) {
  return d === 1 ? "Easy" : d === 2 ? "Medium" : "Hard";
}

function reqLabel(req: Requirement) {
  const short = req.text.length > 72 ? `${req.text.slice(0, 72)}…` : req.text;
  return short;
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
  const [kit, setKit] = useState<InterviewKit>(initialKit);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [tab, setTab] = useState<TabId>("overview");
  const [expandedQ, setExpandedQ] = useState<string | null>(kit.questions[0]?.id ?? null);

  const coveragePct = useMemo(() => {
    const total = kit.role.requirements.length;
    if (!total) return 100;
    const uncovered = kit.coverage.uncovered_requirement_ids.length;
    return Math.round(((total - uncovered) / total) * 100);
  }, [kit]);

  const uncovered = useMemo(
    () => new Set(kit.coverage.uncovered_requirement_ids),
    [kit.coverage.uncovered_requirement_ids]
  );

  const reqById = useMemo(() => {
    const map = new Map<string, Requirement>();
    for (const r of kit.role.requirements) map.set(r.id, r);
    return map;
  }, [kit.role.requirements]);

  const questionById = useMemo(() => {
    const map = new Map<string, Question>();
    for (const q of kit.questions) map.set(q.id, q);
    return map;
  }, [kit.questions]);

  function updateKit(next: InterviewKit) {
    setKit(next);
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const data = await api<{ kit: { kit: InterviewKit } }>(`/api/kits/${kitId}`, {
        method: "PATCH",
        body: JSON.stringify(kit),
      });
      if (data.kit.kit) {
        setKit(data.kit.kit);
        onSaved?.(data.kit.kit);
      }
      setDirty(false);
      setMessage("All changes saved");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function regenerate(
    kind: "company-brief" | "questions" | "schedule",
    category?: string
  ) {
    const hint = category
      ? `Regenerate only the "${category}" category. Pinned, edited, and user-added questions are kept.`
      : REGEN_HINTS[kind];
    if (!confirm(`${hint}\n\nContinue?`)) return;
    setBusy(category ? `questions:${category}` : kind);
    setMessage("");
    try {
      const body = category ? { category } : {};
      const path =
        kind === "questions"
          ? `/api/kits/${kitId}/regenerate/questions`
          : `/api/kits/${kitId}/regenerate/${kind}`;
      const data = await api<{ kit: { kit: InterviewKit } }>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (data.kit.kit) {
        setKit(data.kit.kit);
        onSaved?.(data.kit.kit);
        setDirty(false);
        setMessage(
          category
            ? `"${category}" questions regenerated`
            : kind === "company-brief"
              ? "Company brief regenerated"
              : kind === "questions"
                ? "Questions regenerated"
                : "Schedule regenerated"
        );
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setBusy("");
    }
  }

  function moveQuestion(index: number, dir: -1 | 1) {
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= kit.questions.length) return;
    const questions = [...kit.questions];
    const [item] = questions.splice(index, 1);
    questions.splice(nextIndex, 0, item);
    updateKit({ ...kit, questions });
  }

  function updateQuestion(id: string, patch: Partial<Question>) {
    updateKit({
      ...kit,
      questions: kit.questions.map((q) =>
        q.id === id
          ? {
              ...q,
              ...patch,
              state: q.state === "user" ? "user" : "edited",
            }
          : q
      ),
    });
  }

  function toggleRequirement(questionId: string, reqId: string) {
    const q = kit.questions.find((x) => x.id === questionId);
    if (!q) return;
    const has = q.requirement_ids.includes(reqId);
    const requirement_ids = has
      ? q.requirement_ids.filter((id) => id !== reqId)
      : [...q.requirement_ids, reqId];
    updateQuestion(questionId, { requirement_ids });
  }

  function addQuestion() {
    const reqId = kit.role.requirements[0]?.id;
    const q: Question = {
      id: `q_user_${Date.now()}`,
      requirement_ids: reqId ? [reqId] : [],
      category: "custom",
      prompt: "New question",
      answer_outline: "Outline your answer…",
      difficulty: 2,
      state: "user",
      pinned: false,
    };
    updateKit({ ...kit, questions: [...kit.questions, q] });
    setExpandedQ(q.id);
    setTab("questions");
  }

  function deleteQuestion(id: string) {
    if (!confirm("Delete this question?")) return;
    updateKit({ ...kit, questions: kit.questions.filter((q) => q.id !== id) });
  }

  function updateFlashcard(id: string, patch: Partial<Flashcard>) {
    updateKit({
      ...kit,
      flashcards: kit.flashcards.map((f) =>
        f.id === id
          ? {
              ...f,
              ...patch,
              state: f.state === "user" ? "user" : "edited",
            }
          : f
      ),
    });
  }

  function addFlashcard() {
    const reqId = kit.role.requirements[0]?.id;
    const id = `f_user_${Date.now()}`;
    updateKit({
      ...kit,
      flashcards: [
        ...kit.flashcards,
        {
          id,
          front: "Front",
          back: "Back",
          requirement_ids: reqId ? [reqId] : [],
          state: "user",
        },
      ],
    });
    setTab("flashcards");
  }

  function deleteFlashcard(id: string) {
    if (!confirm("Delete this flashcard?")) return;
    updateKit({ ...kit, flashcards: kit.flashcards.filter((f) => f.id !== id) });
  }

  const coveredReqs = kit.role.requirements.filter((r) => !uncovered.has(r.id));
  const uncoveredReqs = kit.role.requirements.filter((r) => uncovered.has(r.id));
  const totalMinutes = kit.schedule.days.reduce((sum, d) => sum + d.minutes, 0);
  const questionCategories = useMemo(() => {
    const set = new Set(kit.questions.map((q) => q.category).filter(Boolean));
    for (const c of ["technical", "behavioural", "system-design", "company-fit"]) {
      set.add(c);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [kit.questions]);

  function updateScheduleDay(
    dayNum: number,
    patch: Partial<{ focus: string; minutes: number }>
  ) {
    updateKit({
      ...kit,
      schedule: {
        ...kit.schedule,
        days: kit.schedule.days.map((d) =>
          d.day === dayNum
            ? {
                ...d,
                ...patch,
                minutes:
                  patch.minutes !== undefined
                    ? Math.max(1, Math.floor(Number(patch.minutes)) || d.minutes)
                    : d.minutes,
              }
            : d
        ),
      },
    });
  }

  return (
    <div className="space-y-5">
      <div className="sticky top-[3.25rem] z-20 ui-panel px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/95">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              {kit.source.company}
            </h1>
            <p className="mt-0.5 truncate text-sm text-[var(--muted)]">
              {kit.role.title}
              {kit.role.seniority ? ` · ${kit.role.seniority}` : ""}
              {kit.source.location ? ` · ${kit.source.location}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="w-40">
                <CoverageMeter value={coveragePct / 100} />
              </div>
              {dirty ? (
                <span className="ui-badge ui-badge-warn">Unsaved changes</span>
              ) : (
                <span className="ui-badge ui-badge-neutral">Saved</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!!busy}
              title={REGEN_HINTS["company-brief"]}
              onClick={() => void regenerate("company-brief")}
              className="ui-btn ui-btn-secondary !text-xs sm:!text-sm"
            >
              {busy === "company-brief" ? "Working…" : "Regen brief"}
            </button>
            <button
              type="button"
              disabled={!!busy}
              title={REGEN_HINTS.questions}
              onClick={() => void regenerate("questions")}
              className="ui-btn ui-btn-secondary !text-xs sm:!text-sm"
            >
              {busy === "questions" ? "Working…" : "Regen questions"}
            </button>
            <button
              type="button"
              disabled={!!busy}
              title={REGEN_HINTS.schedule}
              onClick={() => void regenerate("schedule")}
              className="ui-btn ui-btn-secondary !text-xs sm:!text-sm"
            >
              {busy === "schedule" ? "Working…" : "Regen schedule"}
            </button>
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={() => void save()}
              className="ui-btn ui-btn-primary !text-xs sm:!text-sm"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
        {message ? (
          <p className="mt-2 text-sm text-[var(--muted)]" role="status">
            {message}
          </p>
        ) : null}
      </div>

      <nav className="flex gap-1 overflow-x-auto rounded-xl bg-[var(--wash)] p-1" aria-label="Kit sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? "bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-sm)]"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {t.label}
            {t.id === "questions" ? (
              <span className="ml-1.5 tabular-nums text-[var(--muted)]">{kit.questions.length}</span>
            ) : null}
            {t.id === "flashcards" ? (
              <span className="ml-1.5 tabular-nums text-[var(--muted)]">{kit.flashcards.length}</span>
            ) : null}
          </button>
        ))}
      </nav>

      {tab === "overview" ? (
        <div className="space-y-5 ui-fade-up">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: "Requirements", value: kit.role.requirements.length },
              { label: "Questions", value: kit.questions.length },
              { label: "Flashcards", value: kit.flashcards.length },
              { label: "Study minutes", value: totalMinutes },
            ].map((stat) => (
              <div key={stat.label} className="ui-panel px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</p>
              </div>
            ))}
          </div>

          <section className="ui-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-xl">Requirement coverage</h2>
              <p className="text-sm text-[var(--muted)]">
                Passes: {kit.coverage.passes} · Checked in application code
              </p>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[var(--ok)]">
                  Covered ({coveredReqs.length})
                </h3>
                <ul className="space-y-2">
                  {coveredReqs.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-lg border border-[var(--line)] bg-[var(--ok-soft)]/40 px-3 py-2 text-sm"
                    >
                      <div className="mb-1 flex flex-wrap gap-1.5">
                        <span className="ui-badge ui-badge-neutral">{r.kind}</span>
                        <span className="ui-badge ui-badge-accent">{r.priority}</span>
                      </div>
                      {r.text}
                    </li>
                  ))}
                  {coveredReqs.length === 0 ? (
                    <li className="text-sm text-[var(--muted)]">None covered yet.</li>
                  ) : null}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[var(--warn)]">
                  Uncovered ({uncoveredReqs.length})
                </h3>
                <ul className="space-y-2">
                  {uncoveredReqs.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-lg border border-[var(--warn)]/40 bg-[var(--warn-soft)] px-3 py-2 text-sm"
                    >
                      <div className="mb-1 flex flex-wrap gap-1.5">
                        <span className="ui-badge ui-badge-neutral">{r.kind}</span>
                        <span className="ui-badge ui-badge-warn">{r.priority}</span>
                      </div>
                      {r.text}
                    </li>
                  ))}
                  {uncoveredReqs.length === 0 ? (
                    <li className="text-sm text-[var(--ok)]">All requirements covered.</li>
                  ) : null}
                </ul>
              </div>
            </div>
          </section>

          <section className="ui-panel p-5">
            <h2 className="font-[family-name:var(--font-display)] text-xl">Role snapshot</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              From the JD · {kit.source.jd_chars.toLocaleString()} characters researched
              {kit.source.researched_at
                ? ` · ${new Date(kit.source.researched_at).toLocaleString()}`
                : ""}
            </p>
            {kit.role.responsibilities?.length ? (
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[var(--ink)]">
                {kit.role.responsibilities.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">No responsibilities extracted.</p>
            )}
            {kit.source.pages_used?.length ? (
              <div className="mt-4 border-t border-[var(--line)] pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Pages researched
                </p>
                <ul className="mt-2 space-y-1">
                  {kit.source.pages_used.slice(0, 8).map((url) => (
                    <li key={url} className="truncate text-xs">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--accent)] hover:underline"
                      >
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {tab === "brief" ? (
        <section className="ui-panel space-y-4 p-5 ui-fade-up">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl">Company brief</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Edit freely. Regenerating the brief replaces this section and its sources only.
            </p>
          </div>
          <label className="ui-label">
            Summary
            <textarea
              className="ui-textarea mt-1.5"
              value={kit.company_brief.summary}
              onChange={(e) =>
                updateKit({
                  ...kit,
                  company_brief: { ...kit.company_brief, summary: e.target.value },
                })
              }
            />
          </label>
          <label className="ui-label">
            What they do
            <textarea
              className="ui-textarea mt-1.5"
              value={kit.company_brief.what_they_do}
              onChange={(e) =>
                updateKit({
                  ...kit,
                  company_brief: { ...kit.company_brief, what_they_do: e.target.value },
                })
              }
            />
          </label>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Sources
            </p>
            {kit.company_brief.sources.length ? (
              <ul className="mt-2 space-y-1">
                {kit.company_brief.sources.map((src) => (
                  <li key={src} className="truncate text-sm">
                    <a
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--accent)] hover:underline"
                    >
                      {src}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]">No sources recorded.</p>
            )}
          </div>
        </section>
      ) : null}

      {tab === "questions" ? (
        <section className="space-y-4 ui-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl">Question bank</h2>
              <p className="text-sm text-[var(--muted)]">
                Pin or edit questions you want to keep through regeneration. Categories are
                generated with separate prompts.
              </p>
            </div>
            <button type="button" onClick={addQuestion} className="ui-btn ui-btn-secondary">
              Add question
            </button>
          </div>

          <div className="ui-panel flex flex-wrap items-center gap-2 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Regen category
            </span>
            {questionCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                disabled={!!busy}
                className="ui-btn ui-btn-secondary !py-1.5 !text-xs"
                onClick={() => void regenerate("questions", cat)}
              >
                {busy === `questions:${cat}` ? "Working…" : cat}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {kit.questions.map((q, index) => {
              const open = expandedQ === q.id;
              return (
                <div key={q.id} className="ui-panel overflow-hidden">
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--wash)]/60"
                    onClick={() => setExpandedQ(open ? null : q.id)}
                  >
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span className="ui-badge ui-badge-neutral">{q.category}</span>
                        <span className="ui-badge ui-badge-info">{difficultyLabel(q.difficulty)}</span>
                        {q.pinned ? <span className="ui-badge ui-badge-accent">Pinned</span> : null}
                        <span className="ui-badge ui-badge-neutral">{q.state || "generated"}</span>
                      </div>
                      <p className="font-medium text-[var(--ink)]">{q.prompt}</p>
                    </div>
                    <span className="mt-1 text-[var(--muted)]">{open ? "▾" : "▸"}</span>
                  </button>

                  {open ? (
                    <div className="space-y-3 border-t border-[var(--line)] px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <label className="ui-btn ui-btn-secondary !py-1.5 text-xs">
                          <input
                            type="checkbox"
                            className="mr-1.5"
                            checked={!!q.pinned}
                            onChange={(e) => updateQuestion(q.id, { pinned: e.target.checked })}
                          />
                          Pin
                        </label>
                        <button
                          type="button"
                          className="ui-btn ui-btn-secondary !py-1.5 text-xs"
                          onClick={() => moveQuestion(index, -1)}
                        >
                          Move up
                        </button>
                        <button
                          type="button"
                          className="ui-btn ui-btn-secondary !py-1.5 text-xs"
                          onClick={() => moveQuestion(index, 1)}
                        >
                          Move down
                        </button>
                        <button
                          type="button"
                          className="ui-btn ui-btn-danger !py-1.5 text-xs"
                          onClick={() => deleteQuestion(q.id)}
                        >
                          Delete
                        </button>
                      </div>

                      <label className="ui-label">
                        Category
                        <input
                          className="ui-input mt-1.5"
                          value={q.category}
                          onChange={(e) => updateQuestion(q.id, { category: e.target.value })}
                        />
                      </label>
                      <label className="ui-label">
                        Prompt
                        <textarea
                          className="ui-textarea mt-1.5"
                          value={q.prompt}
                          onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
                        />
                      </label>
                      <label className="ui-label">
                        Answer outline
                        <textarea
                          className="ui-textarea mt-1.5"
                          value={q.answer_outline}
                          onChange={(e) =>
                            updateQuestion(q.id, { answer_outline: e.target.value })
                          }
                        />
                      </label>
                      <label className="ui-label">
                        Difficulty
                        <select
                          className="ui-input mt-1.5 w-40"
                          value={q.difficulty}
                          onChange={(e) =>
                            updateQuestion(q.id, {
                              difficulty: Number(e.target.value) as 1 | 2 | 3,
                            })
                          }
                        >
                          <option value={1}>1 · Easy</option>
                          <option value={2}>2 · Medium</option>
                          <option value={3}>3 · Hard</option>
                        </select>
                      </label>

                      <div>
                        <p className="ui-label mb-2">Linked requirements</p>
                        <div className="flex flex-wrap gap-2">
                          {kit.role.requirements.map((req) => {
                            const on = q.requirement_ids.includes(req.id);
                            return (
                              <button
                                key={req.id}
                                type="button"
                                title={req.text}
                                onClick={() => toggleRequirement(q.id, req.id)}
                                className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
                                  on
                                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                                    : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)]"
                                }`}
                              >
                                <span className="font-semibold capitalize">{req.priority}</span>
                                <span className="mt-0.5 block max-w-[14rem] truncate">{reqLabel(req)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {kit.questions.length === 0 ? (
              <div className="ui-panel px-6 py-10 text-center text-sm text-[var(--muted)]">
                No questions yet. Add one or regenerate questions.
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === "flashcards" ? (
        <section className="space-y-4 ui-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl">Flashcards</h2>
              <p className="text-sm text-[var(--muted)]">
                Practice ranks low-confidence cards first in your next session.
              </p>
            </div>
            <button type="button" onClick={addFlashcard} className="ui-btn ui-btn-secondary">
              Add flashcard
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {kit.flashcards.map((f) => (
              <div key={f.id} className="ui-panel flex flex-col p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="ui-badge ui-badge-neutral">{f.state || "generated"}</span>
                  <button
                    type="button"
                    className="ui-btn ui-btn-danger !px-2 !py-1 text-xs"
                    onClick={() => deleteFlashcard(f.id)}
                  >
                    Delete
                  </button>
                </div>
                <label className="ui-label">
                  Front
                  <input
                    className="ui-input mt-1.5"
                    value={f.front}
                    onChange={(e) => updateFlashcard(f.id, { front: e.target.value })}
                  />
                </label>
                <label className="ui-label mt-3">
                  Back
                  <textarea
                    className="ui-textarea mt-1.5 min-h-20"
                    value={f.back}
                    onChange={(e) => updateFlashcard(f.id, { back: e.target.value })}
                  />
                </label>
                {f.requirement_ids.length ? (
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    Covers:{" "}
                    {f.requirement_ids
                      .map((id) => reqById.get(id)?.text)
                      .filter(Boolean)
                      .slice(0, 2)
                      .join(" · ") || "—"}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          {kit.flashcards.length === 0 ? (
            <div className="ui-panel px-6 py-10 text-center text-sm text-[var(--muted)]">
              No flashcards yet.
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "schedule" ? (
        <section className="space-y-4 ui-fade-up">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl">Study schedule</h2>
            <p className="text-sm text-[var(--muted)]">
              {kit.schedule.days_available} days · {totalMinutes} total minutes · allocated in
              application code (not by the LLM). Edit focus or minutes, then save.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {kit.schedule.days.map((day) => (
              <article key={day.day} className="ui-panel p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
                      Day {day.day}
                    </p>
                    <label className="ui-label mt-2">
                      Focus
                      <input
                        className="ui-input mt-1"
                        value={day.focus}
                        onChange={(e) => updateScheduleDay(day.day, { focus: e.target.value })}
                      />
                    </label>
                  </div>
                  <label className="ui-label w-24 shrink-0">
                    Minutes
                    <input
                      className="ui-input mt-1"
                      type="number"
                      min={1}
                      value={day.minutes}
                      onChange={(e) =>
                        updateScheduleDay(day.day, { minutes: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>
                <ol className="mt-3 space-y-2">
                  {day.question_ids.map((qid, i) => {
                    const q = questionById.get(qid);
                    return (
                      <li
                        key={`${qid}-${i}`}
                        className="rounded-lg border border-[var(--line)] bg-[var(--wash)]/50 px-3 py-2 text-sm"
                      >
                        {q ? (
                          <>
                            <span className="ui-badge ui-badge-neutral mb-1">{q.category}</span>
                            <p className="text-[var(--ink)]">{q.prompt}</p>
                          </>
                        ) : (
                          <p className="text-[var(--muted)]">Question unavailable</p>
                        )}
                      </li>
                    );
                  })}
                  {day.question_ids.length === 0 ? (
                    <li className="text-sm text-[var(--muted)]">No questions assigned.</li>
                  ) : null}
                </ol>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
