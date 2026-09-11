"use client";

import type { Requirement } from "@/types/kit";

export function RequirementChecklist({
  requirements,
  selectedIds,
  onToggle,
  emptyLabel = "No requirements on this kit.",
  maxHeightClass = "max-h-40",
}: {
  requirements: Requirement[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  emptyLabel?: string;
  maxHeightClass?: string;
}) {
  return (
    <div>
      <p className="ui-label mb-2">Linked requirements</p>
      <ul className={`${maxHeightClass} space-y-1 overflow-y-auto pr-1`}>
        {requirements.map((req) => {
          const on = selectedIds.includes(req.id);
          return (
            <li key={req.id}>
              <label className="req-check">
                <input type="checkbox" checked={on} onChange={() => onToggle(req.id)} />
                <span className="req-check-meta">
                  <em>{req.priority}</em> · {req.kind}
                </span>
                <span className="req-check-text">{req.text}</span>
              </label>
            </li>
          );
        })}
        {!requirements.length ? (
          <li className="text-sm text-[var(--muted)]">{emptyLabel}</li>
        ) : null}
      </ul>
    </div>
  );
}

export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}
