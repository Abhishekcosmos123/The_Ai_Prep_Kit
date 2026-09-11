"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { ModalShell } from "@/components/ui/ModalShell";

export type ConfirmOptions = {
  eyebrow?: string;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. */
  danger?: boolean;
};

export function ConfirmDialog({
  open,
  eyebrow = "Please confirm",
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  busy,
  onConfirm,
  onClose,
}: ConfirmOptions & {
  open: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <ModalShell
      eyebrow={eyebrow}
      title={title}
      titleId="confirm-dialog-title"
      onClose={busy ? () => undefined : onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="ui-btn ui-btn-secondary"
            disabled={busy}
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`ui-btn ${danger ? "ui-btn-danger-solid" : "ui-btn-primary"}`}
            disabled={busy}
            onClick={onConfirm}
            autoFocus
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      }
    >
      {body ? <div className="confirm-dialog-body">{body}</div> : null}
    </ModalShell>
  );
}

/**
 * Promise-based confirm that renders an in-app modal instead of window.confirm.
 * Render `{dialog}` once in the component tree.
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current?.(false);
      resolveRef.current = resolve;
      setOptions(opts);
    });
  }, []);

  const dialog = (
    <ConfirmDialog
      open={!!options}
      eyebrow={options?.eyebrow}
      title={options?.title ?? ""}
      body={options?.body}
      confirmLabel={options?.confirmLabel}
      cancelLabel={options?.cancelLabel}
      danger={options?.danger}
      onConfirm={() => close(true)}
      onClose={() => close(false)}
    />
  );

  return { confirm, dialog };
}
