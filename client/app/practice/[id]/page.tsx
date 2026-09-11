"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, CircleDashed, Layers } from "lucide-react";
import { Alert, BackLink, EmptyState } from "@/components/ui/primitives";
import { StatMetrics } from "@/components/ui/StatMetrics";
import {
  PracticeDeckList,
  PracticeDone,
  PracticeReady,
  PracticeSession,
} from "@/components/practice/PracticeViews";
import { AuthGate } from "@/hooks/useRequireAuth";
import { api } from "@/lib/api";
import type { ConfidenceLevel } from "@/lib/practiceConfidence";
import type { Flashcard } from "@/types/kit";

type Confidence = { flashcard_id: string; confidence: ConfidenceLevel; updated_at: string };
type Coverage = { covered_count: number; uncovered_count: number; total: number };

function PracticeInner() {
  const params = useParams<{ id: string }>();
  const kitId = params.id;
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
      `/api/kits/${kitId}/practice`
    );
    setCards(data.flashcards);
    setConfidences(data.confidences || []);
    setCoverage(data.coverage || null);
  }, [kitId]);

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load practice"));
  }, [load]);

  const byId = useMemo(() => new Map(confidences.map((c) => [c.flashcard_id, c])), [confidences]);
  const covered = useMemo(() => cards.filter((c) => byId.has(c.id)), [cards, byId]);
  const uncovered = useMemo(() => cards.filter((c) => !byId.has(c.id)), [cards, byId]);
  const deck = useMemo(() => [...uncovered, ...covered], [uncovered, covered]);

  const record = useCallback(
    async (confidence: ConfidenceLevel) => {
      const card = cards[index];
      if (!card || recording) return;
      setRecording(true);
      try {
        await api(`/api/kits/${kitId}/practice`, {
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
    [cards, index, kitId, recording, load]
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
      <div className="ui-page-mid">
        <Alert>{error}</Alert>
        <Link href={`/kits/${kitId}`} className="ui-btn ui-btn-secondary mt-4">
          Back to kit
        </Link>
      </div>
    );
  }

  const card = cards[index];
  const progress = cards.length ? Math.round(((done ? cards.length : index) / cards.length) * 100) : 0;
  const coveragePct =
    coverage && coverage.total ? Math.round((coverage.covered_count / coverage.total) * 100) : 0;

  return (
    <div className="ui-page-mid practice-page">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <BackLink href={`/kits/${kitId}`} label="Back to kit" />
        {!done && cards.length > 0 && !overview ? (
          <p className="text-sm font-medium tabular-nums text-[var(--muted)]">
            Card {index + 1} of {cards.length}
          </p>
        ) : null}
      </div>

      <header className="practice-hero ui-fade-up">
        <div className="practice-hero-icon" aria-hidden>
          <Layers size={22} strokeWidth={1.85} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Flashcard practice
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            Weaker and unseen cards come first. Flip when ready, then rate how well you knew it.
          </p>
        </div>
      </header>

      {coverage ? (
        <StatMetrics
          className="mt-8 ui-fade-up"
          columns={3}
          items={[
            {
              key: "covered",
              label: "Covered",
              value: coverage.covered_count,
              icon: CheckCircle2,
              softClassName: "bg-[var(--ok-soft)] text-[var(--ok)]",
            },
            {
              key: "not-yet",
              label: "Not yet",
              value: coverage.uncovered_count,
              icon: CircleDashed,
              softClassName: "bg-[var(--warn-soft)] text-[var(--warn)]",
            },
            {
              key: "total",
              label: "In deck",
              value: coverage.total,
              icon: Layers,
            },
          ]}
        />
      ) : null}

      {!cards.length ? (
        <div className="mt-10">
          <EmptyState
            title="No flashcards yet"
            body="Finish generation or add cards in the kit builder."
            action={
              <Link href={`/kits/${kitId}`} className="ui-btn ui-btn-primary">
                Open kit
              </Link>
            }
          />
        </div>
      ) : overview && !done ? (
        <div className="mt-10 space-y-8 ui-fade-up">
          <PracticeReady
            coveragePct={coveragePct}
            uncoveredCount={uncovered.length}
            onStart={() => {
              setOverview(false);
              setIndex(0);
              setRevealed(false);
              setDone(false);
            }}
          />
          <PracticeDeckList deck={deck} byId={byId} coveragePct={coverage ? coveragePct : null} />
        </div>
      ) : done ? (
        <PracticeDone
          cardCount={cards.length}
          stats={stats}
          kitId={kitId}
          onReview={() => {
            setOverview(true);
            setDone(false);
            setStats({ weak: 0, okay: 0, confident: 0 });
            void load();
          }}
        />
      ) : (
        <PracticeSession
          card={card}
          isNew={!byId.has(card?.id || "")}
          progress={progress}
          revealed={revealed}
          recording={recording}
          onReveal={() => setRevealed(true)}
          onRate={(level) => void record(level)}
        />
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
