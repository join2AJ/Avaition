// ---------------------------------------------------------------------------
// AVSEC training validity (§13) — every AEP holder must hold current AVSEC
// awareness/refresher training (valid 1 year; annual refresher for a 3-year
// AEP). A lapse must suspend airport access until the refresher is recorded.
// ---------------------------------------------------------------------------

import { today } from "./entitlements";

export type TrainingState = "valid" | "expiring" | "lapsed" | "unknown";

/** Days between two ISO dates (b - a). */
function daysBetween(a: string, b: string): number {
  return Math.round((+new Date(b) - +new Date(a)) / 86400000);
}

/** AVSEC training state for a holder given their refresher-expiry date. */
export function trainingState(expiry?: string): TrainingState {
  if (!expiry) return "unknown";
  const d = daysBetween(today(), expiry);
  if (d < 0) return "lapsed";
  if (d <= 30) return "expiring";
  return "valid";
}

/** Days until (positive) or since (negative) the training expiry. */
export function trainingDays(expiry?: string): number | null {
  return expiry ? daysBetween(today(), expiry) : null;
}

export const TRAINING_META: Record<TrainingState, { label: string; tone: string }> = {
  valid: { label: "Current", tone: "green" },
  expiring: { label: "Refresher due", tone: "amber" },
  lapsed: { label: "Lapsed", tone: "red" },
  unknown: { label: "Not recorded", tone: "slate" },
};

/** One AVSEC refresher cycle from today (used when a refresher is recorded). */
export function nextRefresherDate(): string {
  const d = new Date(today());
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}
