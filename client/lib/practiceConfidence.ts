import type { LucideIcon } from "lucide-react";
import { Meh, ThumbsDown, ThumbsUp } from "lucide-react";

export type ConfidenceLevel = 1 | 2 | 3;

export const CONFIDENCE_META: Record<
  ConfidenceLevel,
  { label: string; hint: string; icon: LucideIcon; tone: string; badge: string }
> = {
  1: {
    label: "Weak",
    hint: "Need more reps",
    icon: ThumbsDown,
    tone: "text-[var(--warn)]",
    badge: "ui-badge-warn",
  },
  2: {
    label: "Okay",
    hint: "Getting there",
    icon: Meh,
    tone: "text-[var(--muted)]",
    badge: "ui-badge-neutral",
  },
  3: {
    label: "Confident",
    hint: "Solid recall",
    icon: ThumbsUp,
    tone: "text-[var(--ok)]",
    badge: "ui-badge-ok",
  },
};

export const CONFIDENCE_LEVELS: ConfidenceLevel[] = [1, 2, 3];
