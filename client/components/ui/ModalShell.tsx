"use client";

import { useEffect, type ReactNode } from "react";
import { IconClose } from "@/components/ui/Icons";

export function ModalShell({
  eyebrow,
  title,
  titleId,
  wide,
  onClose,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  titleId?: string;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="ui-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`ui-modal-card ui-fade-up ${wide ? "ui-modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
              {eyebrow}
            </p>
            <h2 id={titleId} className="mt-1 font-display text-2xl font-bold">
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="ui-icon-btn"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <IconClose />
          </button>
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
}
