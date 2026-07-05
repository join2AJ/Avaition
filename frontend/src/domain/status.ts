import type { ApplicationStatus, Pillar } from "./types";

export const STATUS_META: Record<ApplicationStatus, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "slate" },
  checklist_pending: { label: "Checklist-Pending", tone: "blue" },
  clarification: { label: "Clarification", tone: "amber" },
  committee_scheduled: { label: "Committee", tone: "violet" },
  approved: { label: "Approved", tone: "green" },
  rejected: { label: "Rejected", tone: "red" },
  issued: { label: "Issued", tone: "ink" },
  surrendered: { label: "Surrendered", tone: "slate" },
};

/** Ordered lifecycle for the "Applications by state" chart. */
export const STATE_ORDER: ApplicationStatus[] = [
  "checklist_pending",
  "clarification",
  "committee_scheduled",
  "approved",
  "issued",
  "rejected",
];

export const PILLAR_TONE: Record<Pillar, string> = {
  MAN: "blue",
  MATERIAL: "amber",
  VEHICLE: "teal",
};
