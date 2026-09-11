"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

const STEPS = [
  {
    n: "01",
    title: "Paste the role",
    body: "Drop in the job description and company site. We extract must-have requirements from the JD itself.",
  },
  {
    n: "02",
    title: "Research & generate",
    body: "Company brief, interview questions, and flashcards are built in separate pipeline steps — not one giant prompt.",
  },
  {
    n: "03",
    title: "Study on a plan",
    body: "Coverage is checked in code, then a day-by-day schedule is allocated so you know what to practice next.",
  },
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const primaryHref = !loading && user ? "/dashboard" : "/register";
  const primaryLabel = !loading && user ? "Open my kits" : "Get started free";
  const secondaryHref = !loading && user ? "/kits/new" : "/login";
  const secondaryLabel = !loading && user ? "Create a kit" : "Log in";

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:pt-14">
      <section className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-6 py-14 shadow-[var(--shadow-md)] sm:px-12 sm:py-16 ui-fade-up">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 80% at 100% 0%, rgba(15,118,110,0.14), transparent 55%), linear-gradient(135deg, rgba(15,23,42,0.03), transparent 40%)",
          }}
        />
        <div
          className="pointer-events-none absolute -right-8 bottom-0 h-56 w-56 rounded-full opacity-30 sm:h-72 sm:w-72"
          style={{
            background:
              "conic-gradient(from 180deg at 50% 50%, rgba(15,118,110,0.35), transparent 55%, rgba(29,78,216,0.2))",
            filter: "blur(2px)",
          }}
        />
        <div className="relative max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Interview preparation
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-[1.1] tracking-tight text-[var(--ink)] sm:text-5xl lg:text-6xl">
            The AI Prep Kit
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--muted)]">
            Turn a job description into a researched company brief, coverage-checked questions,
            flashcards, and a day-by-day study schedule.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={primaryHref} className="ui-btn ui-btn-primary !px-5 !py-2.5">
              {primaryLabel}
            </Link>
            <Link href={secondaryHref} className="ui-btn ui-btn-secondary !px-5 !py-2.5">
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-14 ui-fade-up" style={{ animationDelay: "80ms" }}>
        <div className="mb-6 max-w-xl">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            How it works
          </h2>
          <p className="mt-2 text-[var(--muted)]">
            Built like a study plan product — clear steps, visible coverage, and practice you can
            reopen until the interview.
          </p>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.n} className="ui-panel p-5">
              <span className="text-xs font-bold tracking-widest text-[var(--accent)]">{step.n}</span>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="mt-10 grid gap-4 sm:grid-cols-3 ui-fade-up"
        style={{ animationDelay: "140ms" }}
      >
        {[
          {
            title: "Separate pipeline steps",
            body: "Research, extraction, generation, coverage, and scheduling stay distinct and inspectable.",
          },
          {
            title: "Deterministic engines",
            body: "Coverage checks and day allocation run in application code — explainable and testable.",
          },
          {
            title: "Editable & practiceable",
            body: "Pin questions, regenerate sections, and drill flashcards by confidence over time.",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border border-transparent bg-[var(--wash)]/80 p-5">
            <h3 className="font-semibold text-[var(--ink)]">{item.title}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
