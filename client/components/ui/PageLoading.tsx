import type { ReactNode } from "react";
import { Layers } from "lucide-react";

export function PageLoading({
  label = "Loading…",
  icon,
  minHeightClass = "min-h-[40vh]",
}: {
  label?: string;
  icon?: ReactNode;
  minHeightClass?: string;
}) {
  return (
    <div className={`ui-page-mid flex ${minHeightClass} flex-col items-center justify-center ui-fade-up`}>
      <div className="page-loading" role="status" aria-live="polite" aria-label={label}>
        <span className="page-loading-ring" aria-hidden />
        {icon ? (
          <span className="page-loading-icon" aria-hidden>
            {icon}
          </span>
        ) : (
          <span className="page-loading-dot" aria-hidden />
        )}
      </div>
      <p className="mt-5 text-sm font-medium text-[var(--muted)]">{label}</p>
    </div>
  );
}

export function PageLoadingMark() {
  return <Layers size={22} strokeWidth={1.85} />;
}
