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
  { passType: "VAP", pillar: "VEHICLE", label: "Vehicle Area Pass", overall: "7 working days (assumed)", clause: "§14", assumed: true },
];

/** Common lifecycle stages, ordered — used to place any pass's flow on one axis. */
export type Stage =
  | "precheck" | "intake" | "checklist" | "scrutiny" | "bgc"
  | "committee" | "issue" | "reconcile" | "handover" | "closed";

export const STAGE_ORDER: Stage[] = [
  "precheck", "intake", "checklist", "scrutiny", "bgc", "committee", "issue", "reconcile", "handover", "closed",
];

export interface LifecycleStep {
  n: number;
  stage: Stage;
  phase: string;
  action: string;
  owner: string;
  sla: string;
  clause?: string;
  assumed?: boolean;
}

/** MAN · Permanent AEP (BAEP) — the fullest flow. Stop List check precedes intake (§12). */
export const BAEP_LIFECYCLE: LifecycleStep[] = [
  { n: 0, stage: "precheck", phase: "Pre-check", action: "Stop List cross-check (BCAS + Operator)", owner: "Pass Section", sla: "Same day", clause: "§12" },
  { n: 1, stage: "intake", phase: "Intake", action: "Entity / individual submits AEPAF, photo & signed documents", owner: "Entity / AS", sla: "Day 0", clause: "§8.3.2" },
  { n: 2, stage: "checklist", phase: "Intake", action: "Checklist verification — each item Uploaded → Verified", owner: "Pass Section", sla: "2 WD (assumed)", assumed: true },
  { n: 3, stage: "scrutiny", phase: "Scrutiny", action: "Operator scrutinises & forwards to RD BCAS with recommendation", owner: "Airport Operator", sla: "5 WD", clause: "§8.3.3" },
  { n: 4, stage: "bgc", phase: "BGC", action: "Police Background Check (BGC) initiated", owner: "RD BCAS → SP", sla: "≤ 7 days of receipt", clause: "§8.3.3.6" },
  { n: 5, stage: "committee", phase: "Committee", action: "AEP Committee reviews committee-ready file", owner: "RD BCAS + CASO/ASG + Airport Director", sla: "Fortnightly", clause: "§8.3.3" },
  { n: 6, stage: "issue", phase: "Issue", action: "AEP issued (provisional if BGC pending after 1 month)", owner: "RD BCAS", sla: "≤ 5 WD of BGC report", clause: "§8.3.3.11" },
  { n: 7, stage: "reconcile", phase: "Issue", action: "BGC reconciliation; withdraw if not cleared", owner: "RD BCAS", sla: "≤ 3 months", clause: "§11" },
  { n: 8, stage: "handover", phase: "Handover", action: "Card printed and signed for by holder; custodian issues per shift", owner: "Airport Director", sla: "Same day", clause: "§15" },
];

/** MAN · Temporary AEP (TAEP) — no BGC; escort in SRA. Overall SLA 2 WD. */
export const TAEP_LIFECYCLE: LifecycleStep[] = [
  { n: 0, stage: "precheck", phase: "Pre-check", action: "Stop List cross-check", owner: "Pass Section", sla: "Same day", clause: "§12" },
  { n: 1, stage: "intake", phase: "Intake", action: "AS submits Govt ID + undertaking (no BGC)", owner: "Entity / AS", sla: "Day 0", clause: "§8.3.4" },
  { n: 2, stage: "checklist", phase: "Intake", action: "Document verification", owner: "Pass Section", sla: "1 WD (assumed)", assumed: true },
  { n: 3, stage: "committee", phase: "Approval", action: "Operator approval (30-day annual cap enforced)", owner: "Airport Operator", sla: "≤ 2 WD", clause: "§8.3.3.11" },
  { n: 4, stage: "handover", phase: "Handover", action: "TAEP issued · escort mandatory in SRA", owner: "Airport Operator", sla: "Same day", clause: "§7.2" },
];

/** MATERIAL · Tools of Trade (ToT) card — issued by Airport Operator (§10.2). */
export const TOT_LIFECYCLE: LifecycleStep[] = [
  { n: 0, stage: "intake", phase: "Intake", action: "Entity lists controlled tools + purpose (Annexure C category)", owner: "Entity / AS", sla: "Day 0", clause: "§10.2" },
  { n: 1, stage: "checklist", phase: "Verify", action: "Tool category & SRA need verified against holder's AEP", owner: "Pass Section", sla: "2 WD (assumed)", assumed: true },
  { n: 2, stage: "committee", phase: "Approval", action: "Airport Operator approves ToT card", owner: "Airport Operator", sla: "≤ 5 WD (assumed)", assumed: true },
  { n: 3, stage: "handover", phase: "Issue", action: "ToT card issued (separate from AEP)", owner: "Airport Operator", sla: "Same day", clause: "Annex C" },
];

/** VEHICLE · Vehicle Area Pass (VAP) + ADP — issued by Airport Operator (§14). */
export const VAP_LIFECYCLE: LifecycleStep[] = [
  { n: 0, stage: "intake", phase: "Intake", action: "Vehicle papers (RC, PUC, Fitness, Speed Governor) + driver ADP", owner: "Entity / AS", sla: "Day 0", clause: "§14" },
  { n: 1, stage: "checklist", phase: "Verify", action: "Document verification + Airside Driving Permit check", owner: "Pass Section", sla: "3 WD (assumed)", assumed: true },
  { n: 2, stage: "committee", phase: "Approval", action: "Airport Operator approves; RFID tag mapped", owner: "Airport Operator", sla: "≤ 7 WD (assumed)", assumed: true },
  { n: 3, stage: "handover", phase: "Issue", action: "VAP displayed on windshield · max 1 year, non-transferable", owner: "Airport Operator", sla: "Same day", clause: "§14" },
];

/** Pick the lifecycle for a given pass. */
export function lifecycleFor(pillar: Pillar, passType: PassType): LifecycleStep[] {
  if (pillar === "MATERIAL") return TOT_LIFECYCLE;
  if (pillar === "VEHICLE") return VAP_LIFECYCLE;
  if (passType === "TAEP" || passType === "VAT") return TAEP_LIFECYCLE;
  return BAEP_LIFECYCLE;
}

/** Map an application status to the stage it has reached. */
export function reachedStage(status: string): Stage {
  const map: Record<string, Stage> = {
    draft: "intake",
    checklist_pending: "checklist",
    clarification: "checklist",
    committee_scheduled: "committee",
    approved: "issue",
    issued: "closed",
    parked: "closed",
    deactivated: "closed",
    withdrawn: "closed",
    rejected: "committee",
    surrendered: "closed",
  };
  return map[status] ?? "intake";
}

export type StepState = "done" | "current" | "pending";
export type SlaHealth = "on_track" | "at_risk" | "breached";

/** Per-step state given where the application has reached. */
export function stepState(step: LifecycleStep, status: string): StepState {
  const reached = STAGE_ORDER.indexOf(reachedStage(status));
  const here = STAGE_ORDER.indexOf(step.stage);
  if (here < reached) return "done";
  if (here === reached) return "current";
  return "pending";
}

/** Overall SLA health for the application (demo heuristic; real clock is server-side). */
export function slaHealth(status: string): SlaHealth {
  if (status === "clarification" || status === "parked" || status === "deactivated") return "at_risk";
  if (status === "rejected" || status === "surrendered" || status === "withdrawn") return "breached";
  return "on_track";
}

export const SLA_HEALTH_META: Record<SlaHealth, { label: string; tone: string }> = {
  on_track: { label: "On track", tone: "green" },
  at_risk: { label: "At risk", tone: "amber" },
  breached: { label: "Breached", tone: "red" },
};

/** Ongoing lifecycle clocks common to AEP · ToT · VAP. */
export const LIFECYCLE_CLOCKS = [
  { label: "Parked (non-use)", value: "60 days", note: "Suspended, not cancelled", clause: "§10.6" },
  { label: "Un-park after request", value: "24 hours", note: "Then 7 days to use", clause: "§10.6" },
  { label: "Surrender after exit", value: "1 week", note: "Termination / resignation / expiry", clause: "§10.7" },
  { label: "AVSEC training validity", value: "1 year", note: "Refresher annual for 3-yr AEP", clause: "§13" },
  { label: "Surprise checks", value: "Monthly", note: "AEP Checking Committee", clause: "§15" },
  { label: "Max AEP validity", value: "3 years", note: "Min 31 days · co-terminus", clause: "§7.1" },
];
