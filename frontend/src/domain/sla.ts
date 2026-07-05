// ---------------------------------------------------------------------------
// SLA model — every pass carries a step-by-step flow, and each step has a
// defined (or, where the order is silent, clearly-marked ASSUMED) SLA so the
// counter can track and improve turnaround. All figures trace to BCAS AEP
// Guidelines 2022 (AVSEC Order 02/2022); WD = clear working days.
// Sources: handbook Tables 14–16 & 23, deck slides 18–19, 22, 32.
// ---------------------------------------------------------------------------

import type { PassType, Pillar } from "./types";

export interface SlaStandard {
  passType: PassType;
  pillar: Pillar;
  label: string;
  overall: string; // headline turnaround
  clause: string;
  assumed?: boolean;
}

/** End-to-end processing-time standard per pass type (Para 8.3.3.11). */
export const SLA_STANDARDS: SlaStandard[] = [
  { passType: "VAT", pillar: "MAN", label: "Visitor Admission Ticket", overall: "On demand · at the gate", clause: "§7.3" },
  { passType: "TAEP", pillar: "MAN", label: "Temporary AEP (1–30 days)", overall: "2 working days", clause: "§8.3.3.11" },
  { passType: "BAEP", pillar: "MAN", label: "Permanent AEP (biometric)", overall: "35 working days (incl. BGC)", clause: "§8.3.3.11" },
  { passType: "Permanent", pillar: "MAN", label: "Protocol / Permanent AEP", overall: "35 working days", clause: "§8.3.3.11" },
  { passType: "ToT", pillar: "MATERIAL", label: "Tools of Trade card", overall: "5 working days (assumed)", clause: "§10.2 · Annex C", assumed: true },
  { passType: "VEP", pillar: "VEHICLE", label: "Vehicle Entry Permit", overall: "7 working days (assumed)", clause: "§14", assumed: true },
];

export interface LifecycleStep {
  n: number;
  phase: string;
  action: string;
  owner: string;
  sla: string;
  clause?: string;
  assumed?: boolean;
}

/**
 * The Permanent AEP (BAEP) lifecycle — the fullest flow; TAEP/ToT/VEP are
 * shorter subsets. A mandatory Stop List check precedes step 1 (§12).
 */
export const BAEP_LIFECYCLE: LifecycleStep[] = [
  { n: 0, phase: "Pre-check", action: "Stop List cross-check (BCAS + Operator)", owner: "Pass Section", sla: "Same day", clause: "§12" },
  { n: 1, phase: "Intake", action: "Entity / individual submits AEPAF, photo & signed documents", owner: "Entity / AS", sla: "Day 0", clause: "§8.3.2" },
  { n: 2, phase: "Intake", action: "Checklist verification — each item Uploaded → Verified", owner: "Pass Section", sla: "2 WD (assumed)", assumed: true },
  { n: 3, phase: "Scrutiny", action: "Operator scrutinises & forwards to RD BCAS with recommendation", owner: "Airport Operator", sla: "5 WD", clause: "§8.3.3" },
  { n: 4, phase: "BGC", action: "Police Background Check (BGC) initiated", owner: "RD BCAS → SP", sla: "≤ 7 days of receipt", clause: "§8.3.3.6" },
  { n: 5, phase: "Committee", action: "AEP Committee reviews committee-ready file", owner: "RD BCAS + CASO/ASG + Airport Director", sla: "Fortnightly", clause: "§8.3.3" },
  { n: 6, phase: "Issue", action: "AEP issued (provisional if BGC pending after 1 month)", owner: "RD BCAS", sla: "≤ 5 WD of BGC report", clause: "§8.3.3.11" },
  { n: 7, phase: "Issue", action: "BGC reconciliation; withdraw if not cleared", owner: "RD BCAS", sla: "≤ 3 months", clause: "§11" },
  { n: 8, phase: "Handover", action: "Card printed and signed for by holder; custodian issues per shift", owner: "Airport Director", sla: "Same day", clause: "§15" },
];

/** Ongoing lifecycle clocks common to AEP · ToT · VEP. */
export const LIFECYCLE_CLOCKS = [
  { label: "Parked (non-use)", value: "60 days", note: "Suspended, not cancelled", clause: "§10.6" },
  { label: "Un-park after request", value: "24 hours", note: "Then 7 days to use", clause: "§10.6" },
  { label: "Surrender after exit", value: "1 week", note: "Termination / resignation / expiry", clause: "§10.7" },
  { label: "AVSEC training validity", value: "1 year", note: "Refresher annual for 3-yr AEP", clause: "§13" },
  { label: "Surprise checks", value: "Monthly", note: "AEP Checking Committee", clause: "§15" },
  { label: "Max AEP validity", value: "3 years", note: "Min 31 days · co-terminus", clause: "§7.1" },
];
