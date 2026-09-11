"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, LoadingBlock, statusBadgeClass, statusLabel } from "@/components/ui/primitives";
import { IconFileText, IconOpen, IconPlus, IconSearch, IconSort, IconTrash } from "@/components/ui/Icons";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api } from "@/lib/api";
import type { KitSummary } from "@/types/kit";
import { initials } from "@/lib/format";
import { companyFromUrl, displayMeta, isPlaceholderMeta } from "@/lib/metaDisplay";

const AVATAR_TONES = ["#111827", "#5b21b6", "#1d4ed8", "#0f766e", "#9a3412", "#1a6b44"];

function kitCompany(kit: KitSummary) {
  if (kit.company && !isPlaceholderMeta(kit.company) && kit.company.toLowerCase() !== "string") {
    return kit.company;
  }
  return companyFromUrl(kit.company_url) || "Company";
}

function toneFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % AVATAR_TONES.length;
  return AVATAR_TONES[h];
}

function coveragePct(kit: KitSummary) {
  if (kit.generationStatus === "queued" || kit.generationStatus === "running") {
    return Math.round(kit.generationPercent || 0);
  }
  if (kit.coverage == null) return null;
  const v = kit.coverage;
  return Math.round(v <= 1 ? v * 100 : v);
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [kits, setKits] = useState<KitSummary[]>([]);
  const [kitsLoading, setKitsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "name">("newest");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setKitsLoading(false);
      return;
    }

    let cancelled = false;
    setKitsLoading(true);
    setError("");
    void api<{ kits: KitSummary[] }>("/api/kits")
      .then((d) => {
        if (!cancelled) setKits(d.kits);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load kits");
        }
      })
      .finally(() => {
        if (!cancelled) setKitsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  async function removeKit(id: string, company: string) {
    const ok = await confirm({
      eyebrow: "Delete kit",
      title: `Delete kit for ${company}?`,
      body: "This permanently removes the kit, questions, flashcards, and practice history. This cannot be undone.",
      confirmLabel: "Delete kit",
      danger: true,
    });
    if (!ok) return;
    setDeleting(id);
    try {
      await api(`/api/kits/${id}`, { method: "DELETE" });
      setKits((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete kit");
    } finally {
      setDeleting(null);
    }
  }

  const readyCount = kits.filter(
    (k) => k.generationStatus === "completed" || k.generationStatus === "incomplete"
  ).length;
  const running = kits.filter(
    (k) => k.generationStatus === "queued" || k.generationStatus === "running"
  ).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = kits;
    if (q) {
      list = list.filter((kit) => {
        const name = kitCompany(kit).toLowerCase();
        const role = (kit.role || "").toLowerCase();
        return name.includes(q) || role.includes(q);
      });
    }
    const next = [...list];
    if (sort === "name") {
      next.sort((a, b) => kitCompany(a).localeCompare(kitCompany(b)));
    } else {
      next.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    }
    return next;
  }, [kits, query, sort]);

  // One loader for auth + kits (and while redirecting unauthenticated users).
  if (authLoading || !user || kitsLoading) {
    return <LoadingBlock label="Loading kits…" />;
  }

  return (
    <div className="ui-page">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="eyebrow-pill">
            <span className="eyebrow-dot" />
            Workspace
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Your interview kits
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            One kit per role — brief, questions, flashcards, and an adaptive study plan tailored to
            your profile.
          </p>
        </div>
      </div>

      {kits.length > 0 ? (
        <div className="dash-toolbar">
          <div className="dash-stats" aria-label="Kit summary">
            <span className="dash-stat">
              <strong>{kits.length}</strong> kits total
            </span>
            <span className="dash-stat dash-stat-ok">
              <span className="status-dot ok" aria-hidden />
              <strong>{readyCount}</strong> ready
            </span>
            <span className={`dash-stat ${running > 0 ? "dash-stat-run" : ""}`}>
              <span className={`status-dot ${running > 0 ? "" : "muted"}`} aria-hidden />
              <strong>{running}</strong> generating
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="dash-search">
              <IconSearch size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter roles or companies…"
                aria-label="Filter kits"
              />
            </label>
            <button
              type="button"
              className="ui-icon-btn"
              title={
                sort === "newest"
                  ? "Sorted by newest — click for name"
                  : "Sorted by name — click for newest"
              }
              aria-label={sort === "newest" ? "Sort by name" : "Sort by newest"}
              onClick={() => setSort((s) => (s === "newest" ? "name" : "newest"))}
            >
              <IconSort />
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mb-4 text-sm text-[var(--warn)]">{error}</p> : null}

      {kits.length === 0 ? (
        <EmptyState
          title="No kits yet"
          body="Paste a job description and company URL to generate your first prep kit."
          action={
            <Link href="/kits/new" className="ui-btn ui-btn-primary">
              <IconPlus size={16} />
              Create your first kit
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--muted)]">No kits match that filter.</p>
      ) : (
        <div className="kit-list">
          {filtered.map((kit) => {
            const canOpen =
              kit.generationStatus === "completed" ||
              kit.generationStatus === "incomplete" ||
              kit.generationStatus === "queued" ||
              kit.generationStatus === "running";
            const isRunning =
              kit.generationStatus === "queued" || kit.generationStatus === "running";
            const name = kitCompany(kit);
            const pct = coveragePct(kit);
            const tone = toneFor(name);
            return (
              <article key={kit.id} className="kit-card ui-fade-up">
                <div className="kit-card-top">
                  <div className="kit-avatar" style={{ background: tone }} aria-hidden>
                    {initials(name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-semibold tracking-tight">{name}</h2>
                      <span className={statusBadgeClass(kit.generationStatus)}>
                        {statusLabel(kit.generationStatus)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-[var(--muted)]">
                      {displayMeta(kit.role, "Role")} · {kit.days_available} days prep ·{" "}
                      {new Date(kit.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/kits/${kit.id}`}
                      className="ui-icon-btn ui-icon-btn-primary"
                      title={isRunning ? "View progress" : "Open kit"}
                      aria-label={isRunning ? "View progress" : "Open kit"}
                    >
                      <IconOpen />
                    </Link>
                    {canOpen && !isRunning ? (
                      <Link
                        href={`/practice/${kit.id}`}
                        className="ui-icon-btn"
                        title="Practice"
                        aria-label="Practice"
                      >
                        <IconFileText />
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className="ui-icon-btn ui-icon-btn-danger"
                      title="Delete kit"
                      aria-label="Delete kit"
                      disabled={deleting === kit.id}
                      onClick={() => void removeKit(kit.id, name)}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
                {pct != null ? (
                  <div className="kit-coverage">
                    <div className="kit-coverage-meta">
                      <span>Coverage depth</span>
                      <span className={pct >= 90 ? "text-[var(--ok)]" : "text-[var(--warn)]"}>
                        {isRunning
                          ? `${pct}% generating`
                          : pct >= 100
                            ? "100% Complete"
                            : `${pct}%`}
                      </span>
                    </div>
                    <div className={`ui-meter ${pct >= 90 ? "ui-meter-ok" : "ui-meter-warn"}`}>
                      <span style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <footer className="dash-footer">
        <span className="inline-flex items-center gap-1.5">
          <span className="status-dot ok" />
          All systems operational
        </span>
        <span>© {new Date().getFullYear()} The AI Prep Kit</span>
      </footer>
      {confirmDialog}
    </div>
  );
}
