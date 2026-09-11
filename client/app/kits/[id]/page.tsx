"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GenerationProgress } from "@/components/kits/GenerationProgress";
import { KitBuilder } from "@/components/kits/KitBuilder";
import { Alert, BackLink, ErrorBox, LoadingBlock, statusBadgeClass, statusLabel } from "@/components/ui/primitives";
import { AuthGate } from "@/hooks/useRequireAuth";
import { api } from "@/lib/api";
import type { KitDetail, InterviewKit } from "@/types/kit";

function KitDetailInner() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<KitDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.id) return;
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
    timer = setInterval(() => void load(), 1500);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [params.id]);

  if (error) return <ErrorBox message={error} href="/dashboard" hrefLabel="Back to kits" />;
  if (!detail) return <LoadingBlock label="Loading kit…" />;

  const generating =
    detail.generationStatus === "queued" || detail.generationStatus === "running";

  return (
    <div className="ui-page-mid max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <BackLink href="/dashboard" label="Kits" />
        <span className={statusBadgeClass(detail.generationStatus)}>
          {statusLabel(detail.generationStatus)}
        </span>
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
          <h1 className="font-display text-2xl font-bold">Generation failed</h1>
          <p className="mt-2 text-sm text-[var(--warn)]">
            {detail.generationError?.message || "Something went wrong."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/kits/new" className="ui-btn ui-btn-primary">
              Try again
            </Link>
            <Link href="/dashboard" className="ui-btn ui-btn-secondary">
              Dashboard
            </Link>
          </div>
        </div>
      ) : null}

      {detail.kit && !generating ? (
        <div>
          {detail.generationStatus === "incomplete" ? (
            <div className="mb-4">
              <Alert>
                <strong>Saved as incomplete.</strong>{" "}
                {detail.generationError?.message || "Some must-haves may still be uncovered."}
              </Alert>
            </div>
          ) : null}
          <KitBuilder
            key={detail.id}
            kitId={detail.id}
            initialKit={detail.kit}
            practiceHref={`/practice/${detail.id}`}
            onSaved={(kit: InterviewKit) => setDetail((prev) => (prev ? { ...prev, kit } : prev))}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function KitDetailPage() {
  return (
    <AuthGate label="Loading kit…">
      <KitDetailInner />
    </AuthGate>
  );
}
