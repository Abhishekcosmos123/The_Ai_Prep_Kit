import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import Link from "next/link";
import { PageLoading } from "@/components/ui/PageLoading";

export function statusBadgeClass(status: string) {
  if (status === "completed") return "ui-badge ui-badge-ok";
  if (status === "incomplete" || status === "failed") return "ui-badge ui-badge-warn";
  if (status === "queued" || status === "running") return "ui-badge ui-badge-info";
  return "ui-badge ui-badge-neutral";
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    queued: "Queued",
    running: "Generating",
    completed: "Ready",
    incomplete: "Incomplete",
    failed: "Failed",
  };
  return map[status] || status;
}

export function coverageTone(pct: number | null | undefined): "ok" | "warn" | "neutral" {
  if (pct == null) return "neutral";
  return pct >= 90 ? "ok" : "warn";
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return <PageLoading label={label} />;
}

export function Alert({
  children,
  tone = "warn",
}: {
  children: ReactNode;
  tone?: "warn" | "ok";
}) {
  return <div className={`ui-alert ui-alert-${tone}`}>{children}</div>;
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
      <h2 className="font-display text-xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function CoverageMeter({
  value,
  label = "Coverage",
}: {
  value: number | null | undefined;
  label?: string;
}) {
  const pct = value == null ? null : Math.round(value * (value <= 1 ? 100 : 1));
  const tone = coverageTone(pct);
  return (
    <div className="min-w-[7rem]">
      <div className="mb-1 flex justify-between gap-2 text-xs text-[var(--muted)]">
        <span>{label}</span>
        <span className="font-semibold text-[var(--ink)]">{pct == null ? "—" : `${pct}%`}</span>
      </div>
      <div
        className={
          tone === "ok" ? "ui-meter ui-meter-ok" : tone === "warn" ? "ui-meter ui-meter-warn" : "ui-meter"
        }
      >
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
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-[2.35rem]">{title}</h1>
        {description ? <p className="mt-2 text-[var(--muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="ui-panel px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone || ""}`}>{value}</p>
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  badge,
  children,
  className = "",
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <label className="ui-label !mb-0" htmlFor={htmlFor}>
          {label}
        </label>
        {badge}
      </div>
      {children}
      {error ? (
        <p className="ui-field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <div className="ui-help">{hint}</div>
      ) : null}
    </div>
  );
}

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`ui-input ${className}`.trim()} {...props} />;
}

export function TextArea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`ui-textarea ${className}`.trim()} {...props} />;
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="ui-btn ui-btn-ghost !px-2">
      ← {label}
    </Link>
  );
}

export function ErrorBox({ message, href = "/dashboard", hrefLabel = "Back" }: { message: string; href?: string; hrefLabel?: string }) {
  return (
    <div className="ui-page">
      <Alert>{message}</Alert>
      <Link href={href} className="ui-btn ui-btn-secondary mt-4">
        {hrefLabel}
      </Link>
    </div>
  );
}
