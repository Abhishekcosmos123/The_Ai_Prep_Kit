"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoadingBlock, PageHeader } from "@/components/ui/primitives";
import { api, ApiError } from "@/lib/api";
import { parseCasesFile } from "@/lib/parseCasesFile";
import type { KitDetail } from "@/types/kit";

const DAY_PRESETS = [3, 5, 7, 14];

export default function NewKitPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [jd, setJd] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [days, setDays] = useState(5);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [batchInfo, setBatchInfo] = useState("");
  const [duplicateKitId, setDuplicateKitId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  async function startGeneration(force = false) {
    setSubmitting(true);
    setError("");
    try {
      const data = await api<{ kit: KitDetail }>("/api/kits", {
        method: "POST",
        body: JSON.stringify({
          jd,
          company_url: companyUrl,
          days,
          ...(force ? { force: true } : {}),
        }),
      });
      router.push(`/kits/${data.kit.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "DUPLICATE_KIT") {
        const existing =
          typeof err.details?.existing_kit_id === "string"
            ? err.details.existing_kit_id
            : null;
        setDuplicateKitId(existing);
        setError(
          existing
            ? "You already created a kit for this job description and company."
            : err.message
        );
      } else {
        setDuplicateKitId(null);
        setError(err instanceof ApiError ? err.message : "Failed to start generation");
      }
      setSubmitting(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setDuplicateKitId(null);

    if (!jd.trim()) {
      setError("Job description is required.");
      return;
    }
    if (jd.length > 50000) {
      setError("Job description is too long.");
      return;
    }
    try {
      new URL(companyUrl);
    } catch {
      setError("Enter a valid HTTP/HTTPS company URL.");
      return;
    }
    if (!Number.isInteger(days) || days < 1 || days > 60) {
      setError("Days must be an integer between 1 and 60.");
      return;
    }

    await startGeneration(false);
  }

  async function onBatchFile(file: File | null) {
    if (!file) return;
    setError("");
    setBatchInfo("");
    setDuplicateKitId(null);
    setSubmitting(true);
    try {
      const text = await file.text();
      const cases = parseCasesFile(text, file.name);
      const data = await api<{ kits: KitDetail[] }>("/api/kits/batch", {
        method: "POST",
        body: JSON.stringify({ cases }),
      });
      setBatchInfo(`Started ${data.kits.length} kit(s). Redirecting to dashboard…`);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Upload failed");
      setSubmitting(false);
    }
  }

  if (loading || !user) return <LoadingBlock />;

  return (
    <div className="ui-page-mid">
      <PageHeader
        eyebrow="New kit"
        title="Create interview kit"
        description="Paste one role, or upload a JSON/CSV of several description-and-company pairs to prepare for multiple interviews at once."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { title: "1. Research", body: "Company site crawl + interview discussions" },
          { title: "2. Generate", body: "Brief, questions, and flashcards from the JD" },
          { title: "3. Plan", body: "Coverage check in code, then a day schedule" },
        ].map((item) => (
          <div key={item.title} className="rounded-xl bg-[var(--wash)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--ink)]">{item.title}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{item.body}</p>
          </div>
        ))}
      </div>

      <section className="ui-panel mb-6 space-y-3 p-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Batch upload</h2>
        <p className="text-sm text-[var(--muted)]">
          JSON array like the evaluate cases file, or CSV with headers{" "}
          <code className="rounded bg-[var(--wash)] px-1">jd,company_url,days</code>. Max 25 cases.
        </p>
        <input
          type="file"
          accept=".json,.csv,application/json,text/csv"
          disabled={submitting}
          onChange={(e) => void onBatchFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
        {batchInfo ? <p className="text-sm text-[var(--ok)]">{batchInfo}</p> : null}
      </section>

      <form onSubmit={onSubmit} className="ui-panel space-y-6 p-6">
        <div>
          <label className="ui-label" htmlFor="jd">
            Job description
          </label>
          <textarea
            id="jd"
            className="ui-textarea mt-1.5 min-h-52"
            required
            maxLength={50000}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job posting — responsibilities, requirements, and nice-to-haves work best."
          />
          <div className="mt-1 flex flex-wrap justify-between gap-2">
            <p className="ui-help">Thin JDs produce thinner kits by design — we don’t invent requirements.</p>
            <p className="text-xs tabular-nums text-[var(--muted)]">{jd.length.toLocaleString()} / 50,000</p>
          </div>
        </div>

        <div>
          <label className="ui-label" htmlFor="companyUrl">
            Company website URL
          </label>
          <input
            id="companyUrl"
            className="ui-input mt-1.5"
            type="url"
            required
            value={companyUrl}
            onChange={(e) => setCompanyUrl(e.target.value)}
            placeholder="https://company.com"
          />
          <p className="ui-help">
            Use the public homepage. We’ll rank and crawl related pages (about, careers, engineering).
          </p>
        </div>

        <div>
          <label className="ui-label" htmlFor="days">
            Days available before the interview
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAY_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`ui-btn !px-3 !py-1.5 ${
                  days === preset ? "ui-btn-primary" : "ui-btn-secondary"
                }`}
                onClick={() => setDays(preset)}
              >
                {preset} days
              </button>
            ))}
          </div>
          <input
            id="days"
            className="ui-input mt-3 w-36"
            type="number"
            min={1}
            max={60}
            required
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
          <p className="ui-help">1–60 days. Questions are distributed round-robin across your plan.</p>
        </div>

        {error ? <p className="text-sm text-[var(--warn)]">{error}</p> : null}
        {duplicateKitId ? (
          <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--warn)]/40 bg-[var(--warn-soft)] p-3">
            <Link href={`/kits/${duplicateKitId}`} className="ui-btn ui-btn-secondary !text-sm">
              Open existing kit
            </Link>
            <button
              type="button"
              disabled={submitting}
              className="ui-btn ui-btn-primary !text-sm"
              onClick={() => void startGeneration(true)}
            >
              Create another anyway
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-5">
          <button type="submit" disabled={submitting} className="ui-btn ui-btn-primary">
            {submitting ? "Starting generation…" : "Start generation"}
          </button>
          <Link href="/dashboard" className="ui-btn ui-btn-ghost">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
