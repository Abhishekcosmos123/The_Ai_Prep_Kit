import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type StatMetricItem = {
  key: string;
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  softClassName?: string;
};

const SOFT_DEFAULT = "bg-[var(--accent-soft)] text-[var(--accent)]";

export function StatMetrics({
  items,
  columns = 4,
  className = "",
}: {
  items: StatMetricItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const cols =
    columns === 2
      ? "grid-cols-2"
      : columns === 3
        ? "grid-cols-3"
        : "grid-cols-2 sm:grid-cols-4";

  return (
    <ul className={`grid ${cols} gap-3 sm:gap-4 ${className}`.trim()}>
      {items.map(({ key, label, value, icon: Icon, softClassName }) => (
        <li key={key} className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${softClassName || SOFT_DEFAULT}`}
          >
            <Icon size={18} strokeWidth={1.85} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold leading-none tabular-nums text-[var(--ink)]">
              {value}
            </p>
            <p className="mt-1 truncate text-xs text-[var(--muted)]">{label}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
