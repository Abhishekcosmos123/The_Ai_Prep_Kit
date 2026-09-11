"use client";

import Link from "next/link";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, TextArea, TextInput } from "@/components/ui/primitives";
import {
  IconClose,
  IconGlobe,
  IconInfo,
  IconMinus,
  IconPlus,
  IconUpload,
} from "@/components/ui/Icons";
import { AuthGate } from "@/hooks/useRequireAuth";
import { api, ApiError } from "@/lib/api";
import { parseCasesFile } from "@/lib/parseCasesFile";
import type { KitDetail } from "@/types/kit";

const PRESETS = [3, 5, 7, 14];
const JD_MAX = 50000;

function NewKitInner() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalTitleId = useId();
  const [jd, setJd] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [days, setDays] = useState(5);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [batchInfo, setBatchInfo] = useState("");
  const [duplicateKitId, setDuplicateKitId] = useState<string | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!batchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBatchOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [batchOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !batchOpen && !submitting) {
        e.preventDefault();
        const form = document.getElementById("create-kit-form") as HTMLFormElement | null;
        form?.requestSubmit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [batchOpen, submitting]);

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
          typeof err.details?.existing_kit_id === "string" ? err.details.existing_kit_id : null;
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
    setDuplicateKitId(null);
    if (!jd.trim()) return setError("Job description is required.");
    if (jd.length > JD_MAX) return setError("Job description is too long.");
    try {
      new URL(companyUrl);
    } catch {
      return setError("Enter a valid HTTP/HTTPS company URL.");
    }
    if (!Number.isInteger(days) || days < 1 || days > 60) return setError("Days must be 1–60.");
    await startGeneration(false);
  }

  async function onBatchFile(file: File | null) {
    if (!file) return;
    setError("");
    setBatchInfo("");
    setDuplicateKitId(null);
    setSubmitting(true);
    try {
      const cases = parseCasesFile(await file.text(), file.name);
      const data = await api<{ kits: KitDetail[] }>("/api/kits/batch", {
        method: "POST",
        body: JSON.stringify({ cases }),
      });
      setBatchInfo(`Started ${data.kits.length} kit(s).`);
      setBatchOpen(false);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Upload failed"
      );
      setSubmitting(false);
    }
  }

  function bumpDays(delta: number) {
    setDays((d) => Math.min(60, Math.max(1, (Number.isFinite(d) ? d : 5) + delta)));
  }

  return (
    <div className="ui-page-mid">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow-pill">
            <span className="eyebrow-dot" />
            New kit
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Create interview kit
          </h1>
          <p className="mt-2 max-w-xl text-[var(--muted)]">
            Paste one role to generate a focused prep kit — or batch-upload several at once.
          </p>
        </div>
        <button type="button" className="batch-trigger" onClick={() => setBatchOpen(true)} disabled={submitting}>
          <IconUpload size={18} />
          <span>Batch upload</span>
        </button>
      </div>

      {batchInfo ? <p className="mb-4 text-sm text-[var(--ok)]">{batchInfo}</p> : null}

      <form
        id="create-kit-form"
        onSubmit={onSubmit}
        className="create-kit-form ui-panel ui-fade-up space-y-7 p-6 sm:p-8"
      >
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="kit-jd" className="ui-label !mb-0 inline-flex items-center gap-1.5">
              Job description
              <span className="text-[var(--danger)]" aria-hidden>
                *
              </span>
              <span title="Paste the full posting for better coverage" className="text-[var(--muted)]">
                <IconInfo size={14} />
              </span>
            </label>
            <span className="text-xs tabular-nums text-[var(--muted)]">
              {jd.length.toLocaleString()} / {JD_MAX.toLocaleString()}
            </span>
          </div>
          <TextArea
            id="kit-jd"
            required
            maxLength={JD_MAX}
            className="ui-textarea min-h-52"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job posting…"
          />
          <p className="field-hint">
            <IconInfo size={14} />
            Thin JDs produce thinner kits — we don’t invent requirements.
          </p>
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="kit-url" className="ui-label !mb-0">
              Company website URL
            </label>
            <span className="text-xs font-medium text-[var(--muted)]">Required</span>
          </div>
          <div className="input-with-icon">
            <span className="input-icon" aria-hidden>
              <IconGlobe size={16} />
            </span>
            <TextInput
              id="kit-url"
              type="url"
              required
              value={companyUrl}
              onChange={(e) => setCompanyUrl(e.target.value)}
              placeholder="https://company.com"
            />
          </div>
          <p className="field-hint">
            <IconInfo size={14} />
            Homepage is fine — we rank and crawl related pages.
          </p>
        </div>

        <div>
          <p className="ui-label">Days before the interview</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                className={`day-chip ${days === n ? "day-chip-active" : ""}`}
                onClick={() => setDays(n)}
              >
                {n} days
              </button>
            ))}
          </div>
          <div className="days-stepper mt-3">
            <input
              className="days-stepper-value"
              type="number"
              min={1}
              max={60}
              required
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              aria-label="Custom days before interview"
            />
            <span className="days-stepper-label">Days</span>
            <div className="days-stepper-controls">
              <button type="button" aria-label="Decrease days" onClick={() => bumpDays(-1)}>
                <IconMinus size={16} />
              </button>
              <button type="button" aria-label="Increase days" onClick={() => bumpDays(1)}>
                <IconPlus size={16} />
              </button>
            </div>
          </div>
        </div>

        {error && !batchOpen ? <Alert>{error}</Alert> : null}
        {duplicateKitId ? (
          <div className="flex flex-wrap gap-2">
            <Link href={`/kits/${duplicateKitId}`} className="ui-btn ui-btn-secondary !text-sm">
              Open existing
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={submitting} className="ui-btn ui-btn-primary">
              <IconPlus size={16} />
              {submitting ? "Starting…" : "Start generation"}
            </button>
            <Link href="/dashboard" className="ui-btn ui-btn-ghost">
              Cancel
            </Link>
          </div>
          <p className="kbd-hint">
            <kbd>⌘</kbd>
            <span>+</span>
            <kbd>Enter</kbd>
            <span>to generate</span>
          </p>
        </div>
      </form>

      <p className="mt-5 text-center text-xs text-[var(--muted)]">
        Encrypted &amp; secure processing · grounded research, not invented claims
      </p>

      {batchOpen ? (
        <div
          className="ui-modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setBatchOpen(false);
          }}
        >
          <div
            className="ui-modal-card ui-fade-up"
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                  Batch
                </p>
                <h2 id={modalTitleId} className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                  Upload interview cases
                </h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Drop a JSON or CSV file with{" "}
                  <code className="rounded bg-[var(--wash)] px-1.5 py-0.5 text-[0.8em]">
                    jd, company_url, days
                  </code>
                  . Max 25 rows.
                </p>
              </div>
              <button
                type="button"
                className="ui-icon-btn shrink-0"
                aria-label="Close"
                disabled={submitting}
                onClick={() => setBatchOpen(false)}
              >
                <IconClose size={16} />
              </button>
            </div>

            <button
              type="button"
              className={`upload-dropzone ${dragOver ? "upload-dropzone-active" : ""}`}
              disabled={submitting}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void onBatchFile(e.dataTransfer.files?.[0] ?? null);
              }}
            >
              <span className="upload-dropzone-icon">
                <IconUpload size={26} />
              </span>
              <span className="text-base font-semibold">
                {submitting ? "Uploading…" : "Choose a file or drop it here"}
              </span>
              <span className="text-sm text-[var(--muted)]">.json or .csv</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,application/json,text/csv"
              className="sr-only"
              disabled={submitting}
              onChange={(e) => {
                void onBatchFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />

            {error && batchOpen ? <Alert>{error}</Alert> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function NewKitPage() {
  return (
    <AuthGate>
      <NewKitInner />
    </AuthGate>
  );
}
