"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

function HeroArt() {
  return (
    <svg viewBox="0 0 520 420" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f6b4c" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <rect x="40" y="48" width="360" height="320" rx="18" fill="#f7f9f8" stroke="#d5ddd8" />
      <path className="ui-draw" d="M78 118h280" stroke="url(#g)" strokeWidth="10" strokeLinecap="round" />
      <path className="ui-draw" style={{ animationDelay: "0.15s" }} d="M78 168h210" stroke="#b7c4bc" strokeWidth="8" strokeLinecap="round" />
      <path className="ui-draw" style={{ animationDelay: "0.3s" }} d="M78 218h250" stroke="#b7c4bc" strokeWidth="8" strokeLinecap="round" />
      <rect x="78" y="258" width="120" height="72" rx="12" fill="#d8f0e6" />
      <rect x="214" y="258" width="120" height="72" rx="12" fill="#e2eaf4" />
      <circle cx="420" cy="120" r="54" fill="#0f6b4c" opacity="0.9" />
      <path d="M400 120h40M420 100v40" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <text x="78" y="98" fill="#5c6b64" fontSize="14" fontFamily="system-ui">Day plan</text>
    </svg>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const inApp = !loading && !!user;

  return (
    <div>
      <section className="relative overflow-hidden border-b border-[var(--line)]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pb-20">
          <div className="ui-fade-up">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
              The AI Prep Kit
            </p>
            <h1 className="font-display max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Prep that starts from the posting — not a generic quiz bank.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-[var(--muted)]">
              Paste a job description and company URL. Get a researched brief, coverage-checked
              questions, flashcards, and a day-by-day schedule.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={inApp ? "/dashboard" : "/register"} className="ui-btn ui-btn-primary !px-5 !py-2.5">
                {inApp ? "Open my kits" : "Get started free"}
              </Link>
              <Link href={inApp ? "/kits/new" : "/login"} className="ui-btn ui-btn-secondary !px-5 !py-2.5">
                {inApp ? "Create a kit" : "Log in"}
              </Link>
            </div>
          </div>
          <div className="relative ui-fade-up" style={{ animationDelay: "90ms" }}>
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_70%_30%,rgba(15,107,76,0.18),transparent_60%)]" />
            <HeroArt />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 ui-fade-up" style={{ animationDelay: "140ms" }}>
        <h2 className="font-display text-2xl font-bold tracking-tight">Three deliberate steps</h2>
        <p className="mt-2 max-w-xl text-[var(--muted)]">
          Research, generation, and scheduling stay separate — coverage is checked in code, not guessed by the model.
        </p>
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {[
            ["Paste the role", "JD + company site. Must-haves come from the posting itself."],
            ["Watch the pipeline", "Crawl, brief, category questions, gap-fill, flashcards."],
            ["Study the plan", "Edit freely, regenerate sections, practice by confidence."],
          ].map(([title, body], i) => (
            <li key={title} className="border-t border-[var(--line-strong)] pt-4">
              <span className="text-xs font-bold tracking-[0.14em] text-[var(--accent)]">0{i + 1}</span>
              <h3 className="mt-2 font-display text-xl font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
