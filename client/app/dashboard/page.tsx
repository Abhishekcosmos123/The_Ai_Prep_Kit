"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  CoverageMeter,
  EmptyState,
  LoadingBlock,
  PageHeader,
  statusBadgeClass,
  statusLabel,
} from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { KitSummary } from "@/types/kit";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [kits, setKits] = useState<KitSummary[]>([]);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const data = await api<{ kits: KitSummary[] }>("/api/kits");
        setKits(data.kits);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load kits");
      }
    })();
  }, [user]);

  async function removeKit(id: string, company: string) {
    if (!confirm(`Delete the prep kit for ${company}? This cannot be undone.`)) return;
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

  if (loading || !user) return <LoadingBlock />;

  const readyCount = kits.filter(
    (k) => k.generationStatus === "completed" || k.generationStatus === "incomplete"
  ).length;
  const runningCount = kits.filter(
    (k) => k.generationStatus === "queued" || k.generationStatus === "running"
  ).length;

  return (
    <div className="ui-page">
      <PageHeader
        eyebrow="Workspace"
        title="Your interview kits"
        description="Each kit is a researched brief, question bank, flashcards, and study schedule for one role."
        actions={
          <Link href="/kits/new" className="ui-btn ui-btn-primary">
            Create interview kit
          </Link>
        }
      />

      {kits.length > 0 ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="ui-panel px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Kits</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{kits.length}</p>
          </div>
          <div className="ui-panel px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Ready</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--ok)]">{readyCount}</p>
          </div>
          <div className="ui-panel px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Generating
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--info)]">
              {runningCount}
            </p>
          </div>
        </div>
      ) : null}

      {error ? <p className="mb-4 text-sm text-[var(--warn)]">{error}</p> : null}

      {kits.length === 0 ? (
        <EmptyState
          title="No kits yet"
          body="Paste a job description and company URL to generate your first coverage-checked prep kit."
          action={
            <Link href="/kits/new" className="ui-btn ui-btn-primary">
              Create your first kit
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4">
          {kits.map((kit) => {
            const canPractice =
              kit.generationStatus === "completed" || kit.generationStatus === "incomplete";
            const isRunning =
              kit.generationStatus === "queued" || kit.generationStatus === "running";

            return (
              <article
                key={kit.id}
                className="ui-panel flex flex-col gap-4 p-5 transition hover:border-[var(--line-strong)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                      {kit.company || "Company"}
                    </h2>
                    <span className={statusBadgeClass(kit.generationStatus)}>
                      {statusLabel(kit.generationStatus)}
                    </span>
                    {isRunning ? (
                      <span className="text-xs text-[var(--muted)]">
                        {kit.generationPercent}% complete
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-sm text-[var(--muted)]">
                    {kit.role || "Role"} · {kit.days_available} day plan · Created{" "}
                    {new Date(kit.createdAt).toLocaleDateString()}
                  </p>
                  {canPractice ? (
                    <div className="mt-3 max-w-xs">
                      <CoverageMeter value={kit.coverage} />
                    </div>
                  ) : isRunning ? (
                    <div className="mt-3 max-w-xs">
                      <div className="ui-meter">
                        <span style={{ width: `${kit.generationPercent || 0}%` }} />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/kits/${kit.id}`} className="ui-btn ui-btn-primary">
                    {isRunning ? "View progress" : "Open kit"}
                  </Link>
                  {canPractice ? (
                    <Link href={`/practice/${kit.id}`} className="ui-btn ui-btn-secondary">
                      Practice
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="ui-btn ui-btn-danger"
                    disabled={deleting === kit.id}
                    onClick={() => void removeKit(kit.id, kit.company || "this kit")}
                  >
                    {deleting === kit.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
