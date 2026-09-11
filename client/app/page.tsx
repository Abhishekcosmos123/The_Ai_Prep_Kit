"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

function HeroVisual() {
  return (
    <div className="landing-visual" aria-hidden>
      <div className="landing-visual-glow" />
      <div className="landing-visual-card">
        <div className="landing-visual-bar">
          <span />
          <span />
          <span />
        </div>
        <p className="landing-visual-label">Generation roadmap</p>
        <div className="landing-visual-steps">
          <div className="landing-step is-done">
            <i /> Research
          </div>
          <div className="landing-step is-done">
            <i /> Brief
          </div>
          <div className="landing-step is-active">
            <i /> Questions
          </div>
          <div className="landing-step">
            <i /> Schedule
          </div>
        </div>
        <div className="landing-visual-meter">
          <span style={{ width: "68%" }} />
        </div>
        <p className="landing-visual-meta">Coverage pass 2 · filling gaps</p>
      </div>
      <div className="landing-visual-float landing-visual-float-a">Must-haves covered</div>
      <div className="landing-visual-float landing-visual-float-b">5-day plan ready</div>
    </div>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const inApp = !loading && !!user;

  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-copy ui-fade-up">
            <p className="landing-brand">The AI Prep Kit</p>
            <h1 className="landing-title">
              Interview prep that starts from the job — and proves the gaps are closed.
            </h1>
            <p className="landing-lede">
              Paste a description and company URL. We research the company, generate a structured
              kit, check coverage in code, and build your day-by-day plan.
            </p>
            <div className="landing-cta">
              <Link
                href={inApp ? "/dashboard" : "/register"}
                className="ui-btn ui-btn-primary ui-btn-glow !px-5 !py-3"
              >
                {inApp ? "Open my kits" : "Get started free"}
              </Link>
              <Link
                href={inApp ? "/kits/new" : "/login"}
                className="ui-btn ui-btn-secondary !px-5 !py-3"
              >
                {inApp ? "Create a kit" : "Log in"}
              </Link>
            </div>
          </div>
          <div className="ui-fade-up" style={{ animationDelay: "120ms" }}>
            <HeroVisual />
          </div>
        </div>
      </section>

      <section className="landing-steps ui-fade-up" style={{ animationDelay: "180ms" }}>
        <div className="landing-steps-inner">
          <p className="landing-steps-kicker">How it works</p>
          <h2 className="landing-steps-title">Three deliberate steps</h2>
          <p className="landing-steps-lede">
            Research, generation, and scheduling stay separate — coverage is checked in application
            code, not guessed by the model.
          </p>
          <ol className="landing-step-grid">
            {[
              ["Paste the role", "JD + company site. Must-haves come from the posting itself."],
              ["Watch the pipeline", "Crawl, brief, category questions, gap-fill, flashcards."],
              ["Study the plan", "Edit freely, regenerate sections, practice by confidence."],
            ].map(([title, body], i) => (
              <li key={title} className="landing-step-card">
                <span className="landing-step-num">0{i + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
