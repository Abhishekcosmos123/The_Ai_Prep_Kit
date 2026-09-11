"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Alert, BackLink, EmptyState } from "@/components/ui/primitives";
import { AuthGate } from "@/hooks/useRequireAuth";
import { api } from "@/lib/api";
import type { Flashcard } from "@/types/kit";

type Confidence = { flashcard_id: string; confidence: 1 | 2 | 3; updated_at: string };
type Coverage = { covered_count: number; uncovered_count: number; total: number };

function PracticeInner() {
  const params = useParams<{ id: string }>();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [confidences, setConfidences] = useState<Confidence[]>([]);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [recording, setRecording] = useState(false);
  const [stats, setStats] = useState({ weak: 0, okay: 0, confident: 0 });
  const [overview, setOverview] = useState(true);

  const load = useCallback(async () => {
    const data = await api<{ flashcards: Flashcard[]; confidences: Confidence[]; coverage: Coverage }>(
      `/api/kits/${params.id}/practice`
    );
    setCards(data.flashcards);
    setConfidences(data.confidences || []);
    setCoverage(data.coverage || null);
  }, [params.id]);

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load practice"));
  }, [load]);

  const byId = useMemo(() => new Map(confidences.map((c) => [c.flashcard_id, c])), [confidences]);
  const covered = cards.filter((c) => byId.has(c.id));
  const uncovered = cards.filter((c) => !byId.has(c.id));

  const record = useCallback(
    async (confidence: 1 | 2 | 3) => {
      const card = cards[index];
      if (!card || recording) return;
      setRecording(true);
      try {
        await api(`/api/kits/${params.id}/practice`, {
          method: "POST",
          body: JSON.stringify({ flashcard_id: card.id, confidence }),
        });
        setStats((s) => ({
          weak: s.weak + (confidence === 1 ? 1 : 0),
          okay: s.okay + (confidence === 2 ? 1 : 0),
          confident: s.confident + (confidence === 3 ? 1 : 0),
        }));
        setRevealed(false);
        if (index + 1 >= cards.length) {
          setDone(true);
          await load();
        } else setIndex((i) => i + 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save confidence");
      } finally {
        setRecording(false);
      }
    },
    [cards, index, params.id, recording, load]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done || !cards.length || overview) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && !recording) {
        if (e.key === "1") void record(1);
        if (e.key === "2") void record(2);
        if (e.key === "3") void record(3);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, done, cards.length, record, recording, overview]);

  if (error) {
    return (
      <div className="ui-page-narrow">
        <Alert>{error}</Alert>
        <Link href={`/kits/${params.id}`} className="ui-btn ui-btn-secondary mt-4">Back to kit</Link>
      </div>
    );
  }

  const card = cards[index];
  const progress = cards.length ? Math.round((index / cards.length) * 100) : 0;

  return (
    <div className="ui-page-narrow">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <BackLink href={`/kits/${params.id}`} label="Back to kit" />
        {!done && cards.length > 0 && !overview ? (
          <p className="text-sm tabular-nums text-[var(--muted)]">{index + 1} / {cards.length}</p>
        ) : null}
      </div>

      <h1 className="font-display text-3xl font-bold tracking-tight">Flashcard practice</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Weaker and unseen cards come first next time. Space/Enter reveal · 1 / 2 / 3 rate.
      </p>

      {coverage ? (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            [coverage.covered_count, "Covered", "bg-[var(--ok-soft)] text-[var(--ok)]"],
            [coverage.uncovered_count, "Not yet", "bg-[var(--warn-soft)] text-[var(--warn)]"],
            [coverage.total, "Total", "bg-[var(--wash)]"],
          ].map(([n, label, cls]) => (
            <div key={String(label)} className={`rounded-lg px-2 py-3 ${cls}`}>
              <p className="text-xl font-semibold tabular-nums">{n}</p>
              <p className="text-xs text-[var(--muted)]">{label}</p>
            </div>
          ))}
        </div>
      ) : null}

      {!cards.length ? (
        <div className="mt-8">
          <EmptyState title="No flashcards yet" body="Finish generation or add cards in the kit builder." action={<Link href={`/kits/${params.id}`} className="ui-btn ui-btn-primary">Open kit</Link>} />
        </div>
      ) : overview && !done ? (
        <div className="mt-8 space-y-5 ui-fade-up">
          <div className="ui-panel p-5">
            <h2 className="font-display text-xl font-bold">Covered vs not yet</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(
                [
                  { title: "Covered", list: covered, tone: "text-[var(--ok)]", box: "bg-[var(--ok-soft)]/40" },
                  { title: "Not covered", list: uncovered, tone: "text-[var(--warn)]", box: "bg-[var(--warn-soft)] border-[var(--warn)]/40" },
                ] as const
              ).map(({ title, list, tone, box }) => (
                <div key={title}>
                  <h3 className={`mb-2 text-sm font-semibold ${tone}`}>{title} ({list.length})</h3>
                  <ul className="max-h-56 space-y-2 overflow-y-auto">
                    {list.map((c) => (
                      <li key={c.id} className={`rounded-lg border border-[var(--line)] px-3 py-2 text-sm ${box}`}>
                        <p className="font-medium">{c.front}</p>
                        {byId.get(c.id) ? (
                          <p className="mt-1 text-xs text-[var(--muted)]">Confidence {byId.get(c.id)!.confidence}</p>
                        ) : null}
                      </li>
                    ))}
                    {!list.length ? <li className="text-sm text-[var(--muted)]">None.</li> : null}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <button type="button" className="ui-btn ui-btn-primary" onClick={() => { setOverview(false); setIndex(0); setRevealed(false); setDone(false); }}>
            Start practice session
          </button>
        </div>
      ) : done ? (
        <div className="ui-panel mt-8 px-6 py-10 text-center ui-fade-up">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">Session complete</p>
          <h2 className="mt-2 font-display text-2xl font-bold">Nice work</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Reviewed {cards.length} cards.</p>
          <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-3">
            {([[stats.weak, "Weak", "text-[var(--warn)]"], [stats.okay, "Okay", ""], [stats.confident, "Confident", "text-[var(--ok)]"]] as const).map(([n, label, tone]) => (
              <div key={label} className="rounded-lg bg-[var(--wash)] px-2 py-3">
                <p className={`text-xl font-semibold tabular-nums ${tone}`}>{n}</p>
                <p className="text-xs text-[var(--muted)]">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <button type="button" className="ui-btn ui-btn-primary" onClick={() => { setOverview(true); setDone(false); setStats({ weak: 0, okay: 0, confident: 0 }); void load(); }}>
              Review coverage
            </button>
            <Link href={`/kits/${params.id}`} className="ui-btn ui-btn-secondary">Review kit</Link>
          </div>
        </div>
      ) : (
        <div className="ui-panel mt-8 overflow-hidden ui-fade-up">
          <div className="border-b border-[var(--line)] bg-[var(--wash)]/40 px-6 py-3 text-xs text-[var(--muted)]">
            Card {index + 1} of {cards.length}
            {!byId.has(card?.id || "") ? " · not practiced yet" : null}
          </div>
          <div className="mb-0 px-6 pt-4">
            <div className="ui-meter h-2"><span style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="px-6 py-10">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Prompt</p>
            <div className="mt-2 min-h-24 text-2xl leading-snug">{card?.front}</div>
            {revealed ? (
              <div className="mt-8 border-t border-[var(--line)] pt-6">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Answer</p>
                <div className="mt-2 text-lg leading-relaxed text-[var(--muted)]">{card?.back}</div>
              </div>
            ) : (
              <button type="button" className="ui-btn ui-btn-secondary mt-8" onClick={() => setRevealed(true)}>Reveal answer</button>
            )}
          </div>
          {revealed ? (
            <div className="border-t border-[var(--line)] bg-[var(--wash)]/30 px-6 py-5">
              <p className="mb-3 text-sm font-medium">How well did you know it?</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  [1, "Weak", "text-[var(--warn)]", "Need more reps"],
                  [2, "Okay", "", "Getting there"],
                  [3, "Confident", "text-[var(--ok)]", "Solid recall"],
                ] as const).map(([n, label, tone, sub]) => (
                  <button key={n} type="button" disabled={recording} className="ui-btn ui-btn-secondary !flex-col !items-stretch !py-3 text-left" onClick={() => void record(n)}>
                    <span className={`font-semibold ${tone}`}>{n} · {label}</span>
                    <span className="mt-0.5 text-xs font-normal text-[var(--muted)]">{sub}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function PracticePage() {
  return (
    <AuthGate>
      <PracticeInner />
    </AuthGate>
  );
}
