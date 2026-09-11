"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { GenerationProgress } from "@/components/kits/GenerationProgress";
import { KitBuilder } from "@/components/kits/KitBuilder";
import { LoadingBlock, statusBadgeClass, statusLabel } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { KitDetail, InterviewKit } from "@/types/kit";

export default function KitDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [detail, setDetail] = useState<KitDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || !params.id) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function load() {
      try {
        const data = await api<{ kit: KitDetail }>(`/api/kits/${params.id}`);
        if (cancelled) return;
        setDetail(data.kit);
        const running =
          data.kit.generationStatus === "queued" || data.kit.generationStatus === "running";
        if (!running && timer) {
          clearInterval(timer);
          timer = undefined;
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load kit");
      }
    }

    void load();
    timer = setInterval(() => {
      void load();
    }, 1500);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [user, params.id]);

  if (loading || !user) return <LoadingBlock />;
  if (error) {
    return (
      <div className="ui-page">
        <p className="text-[var(--warn)]">{error}</p>
        <Link href="/dashboard" className="ui-btn ui-btn-secondary mt-4">
          Back to kits
        </Link>
      </div>
    );
  }
  if (!detail) return <LoadingBlock label="Loading kit…" />;

  const generating =
    detail.generationStatus === "queued" || detail.generationStatus === "running";

  return (
    <div className="ui-page-mid max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard" className="ui-btn ui-btn-ghost !px-2">
            ← Kits
          </Link>
          <span className={statusBadgeClass(detail.generationStatus)}>
            {statusLabel(detail.generationStatus)}
          </span>
        </div>
        {detail.kit ? (
          <Link href={`/practice/${detail.id}`} className="ui-btn ui-btn-secondary">
            Practice flashcards
          </Link>
        ) : null}
      </div>

      {generating || (!detail.kit && detail.generationStatus !== "failed") ? (
        <GenerationProgress
          steps={detail.generationProgress || []}
          percent={detail.generationPercent || 0}
          status={detail.generationStatus}
          error={detail.generationError}
          companyUrl={detail.input?.company_url || detail.company_url}
        />
      ) : null}

      {detail.generationStatus === "failed" && !detail.kit ? (
        <div className="ui-panel border-[var(--warn)] bg-[var(--warn-soft)] p-6">
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            Generation failed
          </h1>
          <p className="mt-2 text-sm text-[var(--warn)]">
            {detail.generationError?.message || "Something went wrong while building this kit."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/kits/new" className="ui-btn ui-btn-primary">
              Try again with a new kit
            </Link>
            <Link href="/dashboard" className="ui-btn ui-btn-secondary">
              Back to dashboard
            </Link>
          </div>
        </div>
      ) : null}

      {detail.kit ? (
        <div className="mt-6">
          {detail.generationStatus === "incomplete" ? (
            <div className="mb-4 rounded-xl border border-[var(--warn)] bg-[var(--warn-soft)] px-4 py-3 text-sm text-[var(--warn)]">
              <strong>Saved as incomplete.</strong>{" "}
              {detail.generationError?.message ||
                "Some must-have requirements may still be uncovered — review coverage and regenerate questions if needed."}
            </div>
          ) : null}
          <KitBuilder
            key={`${detail.id}-${detail.updatedAt}-${detail.kit.questions.length}-${detail.kit.flashcards.length}`}
            kitId={detail.id}
            initialKit={detail.kit}
            onSaved={(kit: InterviewKit) =>
              setDetail((prev) => (prev ? { ...prev, kit } : prev))
            }
          />
        </div>
      ) : null}
    </div>
  );
}
