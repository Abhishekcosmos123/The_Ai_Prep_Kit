import type { ReactNode } from "react";

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "completed":
      return "ui-badge ui-badge-ok";
    case "incomplete":
      return "ui-badge ui-badge-warn";
    case "failed":
      return "ui-badge ui-badge-warn";
    case "queued":
    case "running":
      return "ui-badge ui-badge-info";
    default:
      return "ui-badge ui-badge-neutral";
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "running":
      return "Generating";
    case "completed":
      return "Ready";
    case "incomplete":
      return "Incomplete";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

export function coverageTone(pct: number | null | undefined): "ok" | "warn" | "neutral" {
  if (pct == null) return "neutral";
  if (pct >= 90) return "ok";
  if (pct >= 60) return "warn";
  return "warn";
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="ui-page flex items-center gap-3 text-[var(--muted)]">
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--accent)] ui-pulse" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="ui-panel px-8 py-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M7 4h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M14 4v5h5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </div>
      <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function CoverageMeter({
  value,
  label,
}: {
  value: number | null | undefined;
  label?: string;
}) {
  const pct = value == null ? null : Math.round(value * (value <= 1 ? 100 : 1));
  const tone = coverageTone(pct);
  const meterClass =
    tone === "ok" ? "ui-meter ui-meter-ok" : tone === "warn" ? "ui-meter ui-meter-warn" : "ui-meter";

  return (
    <div className="min-w-[7rem]">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
        <span>{label || "Coverage"}</span>
        <span className="font-semibold text-[var(--ink)]">{pct == null ? "—" : `${pct}%`}</span>
      </div>
      <div className={meterClass}>
        <span style={{ width: `${pct ?? 0}%` }} />
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)] sm:text-4xl">
          {title}
        </h1>
        {description ? <p className="mt-2 text-[var(--muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
