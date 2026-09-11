"use client";

import Link from "next/link";
import { CircleDashed, Keyboard, Play, RotateCcw, Sparkles } from "lucide-react";
import type { Flashcard } from "@/types/kit";
import { CONFIDENCE_LEVELS, CONFIDENCE_META, type ConfidenceLevel } from "@/lib/practiceConfidence";

type Confidence = { flashcard_id: string; confidence: ConfidenceLevel; updated_at: string };

export function PracticeReady({
  coveragePct,
  uncoveredCount,
  onStart,
}: {
  coveragePct: number;
  uncoveredCount: number;
  onStart: () => void;
}) {
  const title =
    coveragePct === 100
      ? "Full coverage — sharpen weak cards"
      : uncoveredCount
        ? `${uncoveredCount} new card${uncoveredCount === 1 ? "" : "s"} waiting`
        : "Keep building confidence";

  return (
    <section className="practice-ready">
      <div className="practice-ready-copy">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
          Ready when you are
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">{title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
          Practice prioritizes unseen and weaker cards so each session stays useful.
        </p>
        <div className="practice-keys mt-5">
          <span className="practice-key-chip">
            <Keyboard size={14} strokeWidth={1.85} aria-hidden />
            Space / Enter reveal
          </span>
          <span className="practice-key-chip">1 · 2 · 3 rate</span>
        </div>
      </div>
      <button type="button" className="ui-btn ui-btn-primary practice-start-btn" onClick={onStart}>
        <Play size={18} strokeWidth={2} aria-hidden />
        Start practice session
      </button>
    </section>
  );
}

export function PracticeDeckList({
  deck,
  byId,
  coveragePct,
}: {
  deck: Flashcard[];
  byId: Map<string, Confidence>;
  coveragePct: number | null;
}) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-bold">Your deck</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Unseen cards first, then ones you have already rated.
          </p>
        </div>
        {coveragePct != null ? (
          <div className="min-w-[8rem]">
            <p className="mb-1 text-right text-xs font-medium text-[var(--muted)]">
              {coveragePct}% covered
            </p>
            <div className="ui-meter h-2">
              <span style={{ width: `${coveragePct}%` }} />
            </div>
          </div>
        ) : null}
      </div>

      <ul className="practice-deck">
        {deck.map((c, i) => {
          const conf = byId.get(c.id);
          const meta = conf ? CONFIDENCE_META[conf.confidence] : null;
          const Icon = meta?.icon;
          return (
            <li key={c.id} className="practice-deck-item">
              <span className="practice-deck-index" aria-hidden>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="practice-deck-front">{c.front}</p>
                <p className="practice-deck-back">{c.back}</p>
              </div>
              <div className="shrink-0">
                {meta && Icon ? (
                  <span className={`ui-badge ${meta.badge} !gap-1.5`}>
                    <Icon size={12} strokeWidth={2} aria-hidden />
                    {meta.label}
                  </span>
                ) : (
                  <span className="ui-badge ui-badge-warn !gap-1.5">
                    <CircleDashed size={12} strokeWidth={2} aria-hidden />
                    New
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PracticeSession({
  card,
  isNew,
  progress,
  revealed,
  recording,
  onReveal,
  onRate,
}: {
  card: Flashcard | undefined;
  isNew: boolean;
  progress: number;
  revealed: boolean;
  recording: boolean;
  onReveal: () => void;
  onRate: (level: ConfidenceLevel) => void;
}) {
  return (
    <div className="practice-session mt-10 ui-fade-up">
      <div className="practice-session-top">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[var(--muted)]">
            {isNew ? (
              <span className="ui-badge ui-badge-warn !gap-1.5">
                <CircleDashed size={12} strokeWidth={2} aria-hidden />
                New card
              </span>
            ) : (
              <span className="ui-badge ui-badge-neutral">Practiced before</span>
            )}
          </p>
          <p className="text-sm tabular-nums text-[var(--muted)]">{progress}% through session</p>
        </div>
        <div className="ui-meter mt-3 h-2.5">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <article className={`practice-stage ${revealed ? "is-revealed" : ""}`}>
        <p className="practice-stage-label">Prompt</p>
        <h2 className="practice-stage-front">{card?.front}</h2>

        {revealed ? (
          <div className="practice-stage-answer">
            <p className="practice-stage-label">Answer</p>
            <p className="practice-stage-back">{card?.back}</p>
          </div>
        ) : (
          <button
            type="button"
            className="ui-btn ui-btn-secondary practice-reveal-btn"
            onClick={onReveal}
          >
            Reveal answer
            <kbd className="practice-kbd">Space</kbd>
          </button>
        )}
      </article>

      {revealed ? (
        <div className="practice-rate">
          <p className="mb-3 text-sm font-semibold text-[var(--ink)]">How well did you know it?</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {CONFIDENCE_LEVELS.map((n) => {
              const meta = CONFIDENCE_META[n];
              const Icon = meta.icon;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={recording}
                  className="practice-rate-btn"
                  onClick={() => onRate(n)}
                >
                  <span className={`practice-rate-icon ${meta.tone}`}>
                    <Icon size={20} strokeWidth={1.85} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className={`block font-semibold ${meta.tone}`}>
                      {n} · {meta.label}
                    </span>
                    <span className="mt-0.5 block text-xs font-normal text-[var(--muted)]">
                      {meta.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PracticeDone({
  cardCount,
  stats,
  kitId,
  onReview,
}: {
  cardCount: number;
  stats: { weak: number; okay: number; confident: number };
  kitId: string;
  onReview: () => void;
}) {
  const counts: Record<ConfidenceLevel, number> = {
    1: stats.weak,
    2: stats.okay,
    3: stats.confident,
  };

  return (
    <div className="practice-done mt-10 ui-fade-up">
      <div className="practice-done-icon" aria-hidden>
        <Sparkles size={28} strokeWidth={1.85} />
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
        Session complete
      </p>
      <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">Nice work</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        You reviewed {cardCount} card{cardCount === 1 ? "" : "s"} this round.
      </p>

      <ul className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
        {CONFIDENCE_LEVELS.map((level) => {
          const meta = CONFIDENCE_META[level];
          const Icon = meta.icon;
          return (
            <li
              key={meta.label}
              className="flex flex-col items-center gap-2 rounded-2xl bg-[var(--wash)] px-3 py-5"
            >
              <span className={meta.tone}>
                <Icon size={22} strokeWidth={1.85} aria-hidden />
              </span>
              <p className={`font-display text-2xl font-bold tabular-nums ${meta.tone}`}>
                {counts[level]}
              </p>
              <p className="text-xs text-[var(--muted)]">{meta.label}</p>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" className="ui-btn ui-btn-primary" onClick={onReview}>
          <RotateCcw size={16} strokeWidth={1.85} aria-hidden />
          Review coverage
        </button>
        <Link href={`/kits/${kitId}`} className="ui-btn ui-btn-secondary">
          Back to kit
        </Link>
      </div>
    </div>
  );
}
