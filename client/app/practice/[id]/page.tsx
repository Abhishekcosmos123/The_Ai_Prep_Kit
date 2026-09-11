"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { EmptyState, LoadingBlock } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { Flashcard } from "@/types/kit";

type PracticeConfidence = {
  flashcard_id: string;
  confidence: 1 | 2 | 3;
  updated_at: string;
};

type PracticeCoverage = {
  covered_count: number;
  uncovered_count: number;
  total: number;
  covered_ids: string[];
  uncovered_ids: string[];
};

export default function PracticePage() {
  const params = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [confidences, setConfidences] = useState<PracticeConfidence[]>([]);
  const [coverage, setCoverage] = useState<PracticeCoverage | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sessionStats, setSessionStats] = useState({ weak: 0, okay: 0, confident: 0 });
  const [showOverview, setShowOverview] = useState(true);

  const loadPractice = useCallback(async () => {
    const data = await api<{
      flashcards: Flashcard[];
      confidences: PracticeConfidence[];
      coverage: PracticeCoverage;
    }>(`/api/kits/${params.id}/practice`);
    setCards(data.flashcards);
    setConfidences(data.confidences || []);
    setCoverage(data.coverage || null);
  }, [params.id]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || !params.id) return;
    void (async () => {
      try {
        await loadPractice();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load practice");
      }
    })();
  }, [user, params.id, loadPractice]);

  const confidenceById = useMemo(() => {
    const map = new Map<string, PracticeConfidence>();
    for (const c of confidences) map.set(c.flashcard_id, c);
    return map;
  }, [confidences]);

  const coveredCards = useMemo(
    () => cards.filter((c) => confidenceById.has(c.id)),
    [cards, confidenceById]
  );
  const uncoveredCards = useMemo(
    () => cards.filter((c) => !confidenceById.has(c.id)),
    [cards, confidenceById]
  );

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
        setSessionStats((s) => ({
          weak: s.weak + (confidence === 1 ? 1 : 0),
          okay: s.okay + (confidence === 2 ? 1 : 0),
          confident: s.confident + (confidence === 3 ? 1 : 0),
        }));
        setRevealed(false);
        if (index + 1 >= cards.length) {
          setDone(true);
          await loadPractice();
        } else {
          setIndex((i) => i + 1);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save confidence");
      } finally {
        setRecording(false);
      }
    },
    [cards, index, params.id, recording, loadPractice]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done || cards.length === 0 || showOverview) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed && !recording) {
        if (e.key === "1") void record(1);
        if (e.key === "2") void record(2);
        if (e.key === "3") void record(3);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, done, cards.length, record, recording, showOverview]);

  if (loading || !user) return <LoadingBlock />;
  if (error) {
    return (
      <div className="ui-page-narrow">
        <p className="text-[var(--warn)]">{error}</p>
        <Link href={`/kits/${params.id}`} className="ui-btn ui-btn-secondary mt-4">
          Back to kit
        </Link>
      </div>
    );
  }

  const card = cards[index];
  const progress = cards.length ? Math.round((index / cards.length) * 100) : 0;
  const sessionProgress = done
    ? 100
    : cards.length
      ? Math.round(((index + (revealed ? 0.5 : 0)) / cards.length) * 100)
      : 0;

  return (
    <div className="ui-page-narrow">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/kits/${params.id}`} className="ui-btn ui-btn-ghost !px-2">
          ← Back to kit
        </Link>
        {!done && cards.length > 0 && !showOverview ? (
          <p className="text-sm tabular-nums text-[var(--muted)]">
            {index + 1} / {cards.length}
          </p>
        ) : null}
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
        Flashcard practice
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Rate honestly — weaker and never-practiced cards surface first next time. Space/Enter to
        reveal · 1 / 2 / 3 to rate.
      </p>

      {coverage ? (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-[var(--ok-soft)] px-2 py-3">
            <p className="text-xl font-semibold tabular-nums text-[var(--ok)]">
              {coverage.covered_count}
            </p>
            <p className="text-xs text-[var(--muted)]">Covered</p>
          </div>
          <div className="rounded-lg bg-[var(--warn-soft)] px-2 py-3">
            <p className="text-xl font-semibold tabular-nums text-[var(--warn)]">
              {coverage.uncovered_count}
            </p>
            <p className="text-xs text-[var(--muted)]">Not yet</p>
          </div>
          <div className="rounded-lg bg-[var(--wash)] px-2 py-3">
            <p className="text-xl font-semibold tabular-nums">{coverage.total}</p>
            <p className="text-xs text-[var(--muted)]">Total</p>
          </div>
        </div>
      ) : null}

      {cards.length > 0 && !done && !showOverview ? (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
            <span>Session progress</span>
            <span>{Math.round(sessionProgress)}%</span>
          </div>
          <div className="ui-meter h-2">
            <span style={{ width: `${done ? 100 : progress}%` }} />
          </div>
        </div>
      ) : null}

      {cards.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No flashcards yet"
            body="Open the kit and wait for generation to finish, or add flashcards manually."
            action={
              <Link href={`/kits/${params.id}`} className="ui-btn ui-btn-primary">
                Open kit
              </Link>
            }
          />
        </div>
      ) : showOverview && !done ? (
        <div className="mt-8 space-y-5 ui-fade-up">
          <div className="ui-panel p-5">
            <h2 className="font-[family-name:var(--font-display)] text-xl">What you have covered</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Cards you have rated at least once. Unseen cards are treated as confidence 0 and come
              first in the next session.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[var(--ok)]">
                  Covered ({coveredCards.length})
                </h3>
                <ul className="max-h-56 space-y-2 overflow-y-auto">
                  {coveredCards.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-lg border border-[var(--line)] bg-[var(--ok-soft)]/40 px-3 py-2 text-sm"
                    >
                      <p className="font-medium">{c.front}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Confidence {confidenceById.get(c.id)?.confidence ?? "—"}
                      </p>
                    </li>
                  ))}
                  {coveredCards.length === 0 ? (
                    <li className="text-sm text-[var(--muted)]">None yet — start a session.</li>
                  ) : null}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[var(--warn)]">
                  Not covered ({uncoveredCards.length})
                </h3>
                <ul className="max-h-56 space-y-2 overflow-y-auto">
                  {uncoveredCards.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-lg border border-[var(--warn)]/40 bg-[var(--warn-soft)] px-3 py-2 text-sm"
                    >
                      {c.front}
                    </li>
                  ))}
                  {uncoveredCards.length === 0 ? (
                    <li className="text-sm text-[var(--ok)]">All cards practiced at least once.</li>
                  ) : null}
                </ul>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="ui-btn ui-btn-primary"
            onClick={() => {
              setShowOverview(false);
              setIndex(0);
              setRevealed(false);
              setDone(false);
            }}
          >
            Start practice session
          </button>
        </div>
      ) : done ? (
        <div className="ui-panel mt-8 px-6 py-10 text-center ui-fade-up">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Session complete
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl">Nice work</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            You reviewed {cards.length} card{cards.length === 1 ? "" : "s"} this session.
          </p>
          <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-[var(--warn-soft)] px-2 py-3">
              <p className="text-xl font-semibold tabular-nums text-[var(--warn)]">
                {sessionStats.weak}
              </p>
              <p className="text-xs text-[var(--muted)]">Weak</p>
            </div>
            <div className="rounded-lg bg-[var(--wash)] px-2 py-3">
              <p className="text-xl font-semibold tabular-nums">{sessionStats.okay}</p>
              <p className="text-xs text-[var(--muted)]">Okay</p>
            </div>
            <div className="rounded-lg bg-[var(--ok-soft)] px-2 py-3">
              <p className="text-xl font-semibold tabular-nums text-[var(--ok)]">
                {sessionStats.confident}
              </p>
              <p className="text-xs text-[var(--muted)]">Confident</p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className="ui-btn ui-btn-primary"
              onClick={() => {
                setIndex(0);
                setDone(false);
                setRevealed(false);
                setShowOverview(true);
                setSessionStats({ weak: 0, okay: 0, confident: 0 });
                void loadPractice();
              }}
            >
              Review coverage
            </button>
            <Link href={`/kits/${params.id}`} className="ui-btn ui-btn-secondary">
              Review kit
            </Link>
          </div>
        </div>
      ) : (
        <div className="ui-panel mt-8 overflow-hidden ui-fade-up">
          <div className="border-b border-[var(--line)] bg-[var(--wash)]/40 px-6 py-3 text-xs text-[var(--muted)]">
            Card {index + 1} of {cards.length}
            {!confidenceById.has(card?.id || "") ? " · not practiced yet" : null}
          </div>
          <div className="px-6 py-10">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Prompt
            </p>
            <div className="mt-2 min-h-24 text-2xl leading-snug text-[var(--ink)]">{card?.front}</div>
            {revealed ? (
              <div className="mt-8 border-t border-[var(--line)] pt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Answer
                </p>
                <div className="mt-2 text-lg leading-relaxed text-[var(--muted)]">{card?.back}</div>
              </div>
            ) : (
              <button
                type="button"
                className="ui-btn ui-btn-secondary mt-8"
                onClick={() => setRevealed(true)}
              >
                Reveal answer
              </button>
            )}
          </div>
          {revealed ? (
            <div className="border-t border-[var(--line)] bg-[var(--wash)]/30 px-6 py-5">
              <p className="mb-3 text-sm font-medium text-[var(--ink)]">How well did you know it?</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={recording}
                  className="ui-btn ui-btn-secondary !flex-col !items-stretch !py-3 text-left"
                  onClick={() => void record(1)}
                >
                  <span className="font-semibold text-[var(--warn)]">1 · Weak</span>
                  <span className="mt-0.5 text-xs font-normal text-[var(--muted)]">
                    Need more reps
                  </span>
                </button>
                <button
                  type="button"
                  disabled={recording}
                  className="ui-btn ui-btn-secondary !flex-col !items-stretch !py-3 text-left"
                  onClick={() => void record(2)}
                >
                  <span className="font-semibold">2 · Okay</span>
                  <span className="mt-0.5 text-xs font-normal text-[var(--muted)]">
                    Getting there
                  </span>
                </button>
                <button
                  type="button"
                  disabled={recording}
                  className="ui-btn ui-btn-secondary !flex-col !items-stretch !py-3 text-left"
                  onClick={() => void record(3)}
                >
                  <span className="font-semibold text-[var(--ok)]">3 · Confident</span>
                  <span className="mt-0.5 text-xs font-normal text-[var(--muted)]">
                    Solid recall
                  </span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
