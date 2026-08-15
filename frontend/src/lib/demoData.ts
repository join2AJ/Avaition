import type { Application, Entity, Individual } from "@/domain/types";

// ---------------------------------------------------------------------------
// Demo dataset. This is the ONLY place mock data lives; every screen reads
// through lib/api.ts, so swapping this for the live FastAPI backend is a
// one-file change. Entities are shared across all three pillars — note how
// GHA-Delta sponsors MAN, MATERIAL and VEHICLE applications below with no
// second registration.
// ---------------------------------------------------------------------------

export const ENTITIES: Entity[] = [
  {
    id: "ENT-01", name: "GHA-Delta Ground Services", category: "Ground Handling Agency",
    status: "active", strength: 240, contractStart: "2024-04-01", contractEnd: "2027-03-31",
    aopLinked: true, entitledZones: ["A", "D", "T", "P", "Sd", "B"],
  },
  {
    id: "ENT-02", name: "IndiGo (InterGlobe Aviation)", category: "Scheduled Airline",
    status: "active", strength: 1120, contractStart: "2023-01-01", contractEnd: "2026-12-31",
    aopLinked: true, entitledZones: ["A", "D", "T", "Si", "P"],
  },
  {
    id: "ENT-03", name: "CaterCo Flight Kitchen", category: "Concessionaire",
    status: "active", strength: 64, contractStart: "2024-06-01", contractEnd: "2026-05-31",
    aopLinked: false, entitledZones: ["T", "P"],
  },
  {
    id: "ENT-04", name: "FuelServ Aviation", category: "Auxiliary Service Provider",
    status: "suspended", strength: 38, contractStart: "2024-02-01", contractEnd: "2026-01-31",
    aopLinked: true, entitledZones: ["P", "T"],
  },
  {
    id: "ENT-05", name: "Blue Dart Aviation Cargo", category: "Cargo / Logistics",
    status: "active", strength: 12, contractStart: "2025-01-01", contractEnd: "2026-12-31",
    aopLinked: false, entitledZones: ["Cd", "Csd"],
  },
];

export const INDIVIDUALS: Individual[] = [
  { id: "IND-01", entityId: "ENT-01", name: "R. Sharma", jobRole: "Ramp Agent", hasLogin: true, state: "Uttar Pradesh", district: "Lucknow", religion: "Hindu", bloodGroup: "O+", zones: ["A", "D", "P"], avsecTrainingExpiry: "2027-02-10" },
  { id: "IND-02", entityId: "ENT-01", name: "M. Iyer", jobRole: "Baggage Handler", hasLogin: false, state: "Tamil Nadu", district: "Chennai", religion: "Hindu", bloodGroup: "B+", zones: ["A", "D", "B"], avsecTrainingExpiry: "2026-07-24" },
  { id: "IND-03", entityId: "ENT-03", name: "S. Khan", jobRole: "Catering Loader", hasLogin: true, state: "Uttar Pradesh", district: "Kanpur", religion: "Muslim", bloodGroup: "A+", zones: ["T", "P"], avsecTrainingExpiry: "2026-04-22" },
  { id: "IND-04", entityId: "ENT-04", name: "D. Rao", jobRole: "Fuel Technician", hasLogin: false, state: "Telangana", district: "Hyderabad", religion: "Hindu", bloodGroup: "AB+", zones: ["P", "T"], avsecTrainingExpiry: "2026-12-01" },
  { id: "IND-05", entityId: "ENT-02", name: "P. Nair", jobRole: "Security Screener", hasLogin: false, state: "Kerala", district: "Kochi", religion: "Christian", bloodGroup: "O-", zones: ["T", "Si", "P"], avsecTrainingExpiry: "2027-01-30" },
  { id: "IND-06", entityId: "ENT-05", name: "A. Reddy", jobRole: "Cargo Handler", hasLogin: false, state: "Andhra Pradesh", district: "Vijayawada", religion: "Hindu", bloodGroup: "B-", zones: ["Cd", "Csd"], avsecTrainingExpiry: "2026-05-15" },
  { id: "IND-07", entityId: "ENT-01", name: "V. Singh", jobRole: "AME Technician", hasLogin: false, state: "Punjab", district: "Amritsar", religion: "Sikh", bloodGroup: "B+", zones: ["P", "A"], avsecTrainingExpiry: "2027-03-01" },
];

// §15 — AEP Checking Committee monthly surprise checks + annual 20% audit sample.
export interface SurpriseCheck { m: string; checks: number; findings: number; }
export const SURPRISE_CHECKS: SurpriseCheck[] = [
  { m: "Jan", checks: 36, findings: 2 },
  { m: "Feb", checks: 41, findings: 1 },
  { m: "Mar", checks: 39, findings: 4 },
  { m: "Apr", checks: 44, findings: 2 },
  { m: "May", checks: 38, findings: 3 },
  { m: "Jun", checks: 47, findings: 1 },
  { m: "Jul", checks: 12, findings: 0 },
];
export const AUDITED_THIS_YEAR = 214; // AEP holders physically audited YTD (20% annual sample · §15)

// Zone escalation requests — a pass that asked for zones beyond entitlement,
// hard-blocked at creation and routed to BCAS/committee with justification (§need-to-access).
export interface ZoneEscalation {
  id: string; entityId: string; subject: string; appId?: string;
  requested: string[]; exceeded: string[]; justification: string;
  status: "blocked" | "approved" | "rejected"; since: string; // date + time raised
}
export const ZONE_ESCALATIONS: ZoneEscalation[] = [
  { id: "ESC-01", entityId: "ENT-01", subject: "M. Iyer", appId: "APP-2231", requested: ["A", "D", "T", "P", "Sd"], exceeded: ["P", "Sd"], justification: "Baggage make-up on apron during peak bank — needs P; Sd for domestic SHA reconciliation.", status: "blocked", since: "2026-07-05 11:20" },
  { id: "ESC-02", entityId: "ENT-03", subject: "S. Khan", appId: "APP-2240", requested: ["T", "P"], exceeded: ["P"], justification: "Hi-loader operation at aircraft stand; letterhead attached.", status: "approved", since: "2026-07-03 09:45" },
  { id: "ESC-03", entityId: "ENT-05", subject: "A. Reddy", requested: ["Cd", "Csd", "P"], exceeded: ["P"], justification: "Requested apron access not supported by cargo contract scope.", status: "rejected", since: "2026-06-28 15:10" },
];

export interface StopListEntry { name: string; reason: string; source: string; since: string; }
// BCAS/Operator-maintained bar list — screened before EVERY issuance (§9).
export const STOP_LIST: StopListEntry[] = [
  { name: "V. Malhotra", reason: "AEP not surrendered after termination", source: "Airport Operator", since: "2026-05-12" },
  { name: "K. Prasad", reason: "Adverse notice — Law Enforcement Agency", source: "BCAS RO", since: "2026-06-01" },
  { name: "Rahul Verma", reason: "Lost AEP — pending FIR + penalty", source: "BCAS RO", since: "2026-06-20" },
];

import type { Contract } from "@/domain/types";
export const CONTRACTS: Contract[] = [
  { id: "CON-01", entityId: "ENT-01", counterparty: "Adani Airports — LBIA", type: "Work Order", start: "2024-04-01", end: "2027-03-31", scope: "Ramp & baggage handling", status: "active" },
  { id: "CON-02", entityId: "ENT-01", counterparty: "IndiGo (InterGlobe)", type: "LOA", start: "2025-01-01", end: "2026-08-31", scope: "Below-wing ground handling", status: "active" },
  { id: "CON-03", entityId: "ENT-03", counterparty: "Adani Airports — LBIA", type: "PO", start: "2024-06-01", end: "2026-05-31", scope: "Flight catering", status: "active" },
  { id: "CON-04", entityId: "ENT-05", counterparty: "Blue Dart Express", type: "LOI", start: "2025-01-01", end: "2026-12-31", scope: "Cargo handling", status: "active" },
];

export interface Committee { id: string; date: string; chair: string; members: string; applicationIds: string[]; }
export const COMMITTEES: Committee[] = [
  { id: "CMTE-07", date: "2026-07-09", chair: "RD BCAS (Asst. Director)", members: "CASO/ASG · Airport Director", applicationIds: ["APP-2256"] },
  { id: "CMTE-08", date: "2026-07-23", chair: "RD BCAS (Asst. Director)", members: "CASO/ASG · Airport Director", applicationIds: [] },
];

export interface Surrender {
  id: string; applicationId: string; holder: string; entityId: string;
  reason: "terminated" | "expired" | "deceased" | "surrendered" | "withdrawn";
  exitDate: string; dueDate: string; daysLate: number; entityJustification?: string; penalty?: string; penaltyStatus?: "open" | "resolved";
}
export const SURRENDERS: Surrender[] = [
  { id: "SUR-11", applicationId: "APP-2244", holder: "D. Rao", entityId: "ENT-04", reason: "terminated", exitDate: "2026-06-20", dueDate: "2026-06-27", daysLate: 9,
    entityJustification: "Holder absconded; FIR lodged at airport PS on 30-06.", penalty: "Written warning + re-issue fee", penaltyStatus: "open" },
  { id: "SUR-12", applicationId: "APP-2259", holder: "A. Reddy", entityId: "ENT-05", reason: "expired", exitDate: "2026-07-01", dueDate: "2026-07-08", daysLate: 3, penaltyStatus: undefined },
];

// Audit is login-wise: every entry records the actor (login) and their login
// category (role) so Admin can view the full trail or filter by category.
export interface AuditEntry {
  ts: string; actor: string; role: string; action: string; object: string; detail: string; tone: "ok" | "warn" | "bad";
}
export const AUDIT: AuditEntry[] = [
  { ts: "2026-07-05 09:41", actor: "system", role: "system", action: "sync", object: "AEP register", detail: "2,140 holders reconciled", tone: "ok" },
  { ts: "2026-07-05 10:14", actor: "Pass Section Staff", role: "operator", action: "issue", object: "TOT-0912", detail: "ToT card issued · zone P", tone: "ok" },
  { ts: "2026-07-05 11:02", actor: "Pass Section Staff", role: "operator", action: "send_to_clarification", object: "APP-2240", detail: "BGC older than 3 months · SLA 2 WD", tone: "warn" },
  { ts: "2026-07-05 11:30", actor: "Pass Section Staff", role: "operator", action: "schedule_committee", object: "APP-2256", detail: "CMTE-07 · 2026-07-09", tone: "ok" },
  { ts: "2026-07-05 11:47", actor: "BCAS Officer", role: "bcas", action: "late_surrender_flag", object: "APP-2244", detail: "9 days late · entity notified", tone: "bad" },
  { ts: "2026-07-05 12:03", actor: "Portal Administrator", role: "admin", action: "access_policy", object: "BCAS pillars", detail: "MATERIAL kept hidden", tone: "ok" },
  { ts: "2026-07-05 12:20", actor: "CISF Gate Officer", role: "cisf", action: "verify", object: "APP-2258", detail: "VAP verified at gate · match", tone: "ok" },
  { ts: "2026-07-05 12:35", actor: "GHA-Delta Ground Services", role: "entity", action: "create_application", object: "APP-2247", detail: "MATERIAL · ToT raised", tone: "ok" },
];

export const APPLICATIONS: Application[] = [
  { id: "APP-2216", pillar: "MAN", entityId: "ENT-01", subject: "R. Sharma", passType: "BAEP", zones: ["A", "D", "T"], status: "checklist_pending", createdBy: "Pass Section", createdAt: "2026-07-05", clauseRef: "§5" },
  { id: "APP-2231", pillar: "MAN", entityId: "ENT-01", subject: "M. Iyer", passType: "BAEP", zones: ["A", "D", "T", "P", "Sd"], status: "checklist_pending", createdBy: "Entity", createdAt: "2026-07-05", clauseRef: "§5" },
  { id: "APP-2240", pillar: "MAN", entityId: "ENT-03", subject: "S. Khan", passType: "TAEP", zones: ["T"], status: "clarification", createdBy: "Pass Section", createdAt: "2026-07-04", clauseRef: "§8.3.3" },
  { id: "APP-2244", pillar: "MAN", entityId: "ENT-04", subject: "D. Rao", passType: "BAEP", zones: ["P", "T"], status: "approved", createdBy: "Entity", createdAt: "2026-07-03", clauseRef: "§5" },
  { id: "APP-2247", pillar: "MATERIAL", entityId: "ENT-01", subject: "AME Toolkit · V. Singh", passType: "ToT", zones: ["P"], escort: "R. Sharma", status: "checklist_pending", createdBy: "Entity", createdAt: "2026-07-05", clauseRef: "§12B" },
  { id: "APP-2248", pillar: "VEHICLE", entityId: "ENT-01", subject: "DL-1GC-4471 · pushback tug", passType: "VAP", zones: ["P"], status: "checklist_pending", createdBy: "Entity", createdAt: "2026-07-05", clauseRef: "§12A" },
  { id: "APP-2256", pillar: "MAN", entityId: "ENT-02", individualId: "IND-05", subject: "P. Nair", passType: "BAEP", zones: ["T", "Si"], status: "committee_scheduled", createdBy: "Entity", createdAt: "2026-07-02", clauseRef: "§5" },
  { id: "APP-2257", pillar: "MATERIAL", entityId: "ENT-02", subject: "Catering hi-loader", passType: "ToT", zones: ["P"], escort: "P. Nair", status: "checklist_pending", createdBy: "Entity", createdAt: "2026-07-05", clauseRef: "§12B" },
  { id: "APP-2258", pillar: "VEHICLE", entityId: "ENT-05", subject: "MH-04-CV-2231 · cargo van", passType: "VAP", zones: ["Cd"], status: "issued", createdBy: "Pass Section", createdAt: "2026-06-28", expiryDate: "2026-07-22", clauseRef: "§12A" },
  { id: "APP-2259", pillar: "MAN", entityId: "ENT-05", subject: "A. Reddy", passType: "TAEP", zones: ["Cd", "Csd"], status: "issued", createdBy: "Pass Section", createdAt: "2026-06-25", expiryDate: "2026-07-19", clauseRef: "§5" },
  { id: "APP-2260", pillar: "MAN", entityId: "ENT-03", subject: "N. Gupta", passType: "TAEP", zones: ["T"], status: "rejected", createdBy: "Pass Section", createdAt: "2026-06-30", clauseRef: "§5" },
  { id: "APP-2261", pillar: "MAN", entityId: "ENT-01", subject: "K. Menon", passType: "BAEP", zones: ["A", "T"], status: "parked", createdBy: "Pass Section", createdAt: "2026-04-20", expiryDate: "2027-04-19", clauseRef: "§5",
    stepLog: [{ stage: "handover", at: "2026-04-20 10:15", by: "Pass Section Staff", action: "Issue & print pass" }, { stage: "handover", at: "2026-06-22 09:40", by: "Pass Section Staff", action: "Park (non-use)", note: "No swipe for 60 days — parked pending re-confirmation (§10.6)" }] },
  { id: "APP-2263", pillar: "MAN", entityId: "ENT-03", subject: "T. Fernandes", passType: "TAEP", zones: ["T"], status: "issued", createdBy: "Pass Section", createdAt: "2026-05-20", validFrom: "2026-05-20", validTo: "2026-06-15", expiryDate: "2026-06-15", clauseRef: "§5" },
  { id: "APP-2262", pillar: "MAN", entityId: "ENT-04", subject: "B. Kulkarni", passType: "BAEP", zones: ["P", "T"], status: "withdrawn", createdBy: "Pass Section", createdAt: "2026-03-10", clauseRef: "§5",
    stepLog: [{ stage: "handover", at: "2026-03-10 11:00", by: "Pass Section Staff", action: "Issue & print pass" }, { stage: "closed", at: "2026-06-28 16:20", by: "BCAS Officer", action: "Withdraw (adverse BGC / cancel)", note: "Adverse police verification received — pass withdrawn (§11)" }] },
];

// --- Material Tracking (ToT) -------------------------------------------------
// ToT is material custody: each item gets a code, and every IN / CONSUMED / OUT
// crossing is logged so an agency (and Admin) can reconcile what is still inside.
export interface MaterialItem {
  code: string;            // MAT-01 — each item is assigned a code
  name: string;
  type: string;            // tool | equipment | food | consumable | chemical | spare
  category: string;        // AEP-guideline annexure class A–G
  unit: string;            // nos | kg | litre | box | metre
  weightKg?: number;
  lengthCm?: number; widthCm?: number; heightCm?: number;
  consumable: boolean;     // consumed inside (food/fuel) vs returnable (tool)
  hazardous: boolean;
  image?: string;          // data-URL photo so CISF can identify it at the gate
  entityId: string;        // owning agency
  createdBy: string;
  createdAt: string;
}
export interface MaterialMove {
  id: string;
  code: string;            // material code
  entityId: string;
  requestId?: string;      // the approved ToT authorization this crossing is under
  direction: "in" | "consumed" | "out";
  quantity: number;
  unit: string;
  gate?: string;           // gate used for in/out
  carrier: string;         // person who carried it (name)
  carrierId?: string;      // → Individual.id — the carrier must be a valid AEP holder
  ts: string;              // date + time
  reason?: string;         // for consumed: consumed | sold_out | damaged | returned
  remarks?: string;
  by: string;              // who recorded it
}

// A ToT authorization request — the approval envelope (§12B). An agency submits
// items + qty + purpose + validity + gates; Pass Section reviews and forwards it
// to an authorised signatory (Pass Section IC / CSO / CAO) who approves. Only an
// approved request permits entry/exit at the gate.
export type TotStatus = "submitted" | "reviewed" | "approved" | "rejected";
export interface TotLine { code: string; qty: number; unit: string; }
export interface TotRequest {
  id: string;              // TOT-2201
  entityId: string;
  purpose: string;         // work / where the material is used
  location: string;        // zone / area of use
  validFrom: string; validTo: string;
  gates: string[];         // gates the entry/exit is permitted from
  lines: TotLine[];        // items + authorised quantity
  status: TotStatus;
  submittedBy: string; submittedAt: string;
  reviewedBy?: string; reviewedAt?: string;
  approver?: string; approverDesignation?: string;   // IC | CSO | CAO
  decidedAt?: string; remark?: string;
}

export const TOT_REQUESTS: TotRequest[] = [
  { id: "TOT-2201", entityId: "ENT-01", purpose: "A320 line maintenance", location: "Apron (P)", validFrom: "2026-07-05", validTo: "2026-07-20", gates: ["G3"],
    lines: [{ code: "MAT-01", qty: 1, unit: "box" }, { code: "MAT-03", qty: 5, unit: "litre" }], status: "approved",
    submittedBy: "GHA-Delta Ground Services", submittedAt: "2026-07-04 10:00", reviewedBy: "Pass Section Staff", reviewedAt: "2026-07-04 12:20",
    approver: "R. Menon", approverDesignation: "CSO", decidedAt: "2026-07-04 15:10", remark: "Approved for apron line maintenance." },
  { id: "TOT-2202", entityId: "ENT-02", purpose: "In-flight catering uplift", location: "Apron (P)", validFrom: "2026-07-05", validTo: "2026-07-12", gates: ["G5"],
    lines: [{ code: "MAT-04", qty: 200, unit: "nos" }], status: "reviewed",
    submittedBy: "SkyChef Catering", submittedAt: "2026-07-05 05:40", reviewedBy: "Pass Section Staff", reviewedAt: "2026-07-05 06:05" },
  { id: "TOT-2203", entityId: "ENT-02", purpose: "Terminal deep-clean", location: "Terminal (T)", validFrom: "2026-07-06", validTo: "2026-07-06", gates: ["G7"],
    lines: [{ code: "MAT-05", qty: 20, unit: "litre" }], status: "submitted",
    submittedBy: "SkyChef Catering", submittedAt: "2026-07-05 18:30" },
];

export const MATERIALS: MaterialItem[] = [
  { code: "MAT-01", name: "AME toolkit (box)", type: "tool", category: "A", unit: "box", weightKg: 12.5, lengthCm: 60, widthCm: 40, heightCm: 25, consumable: false, hazardous: false, entityId: "ENT-01", createdBy: "Operator Admin", createdAt: "2026-07-01" },
  { code: "MAT-02", name: "Torque wrench", type: "tool", category: "A", unit: "nos", weightKg: 3.2, consumable: false, hazardous: false, entityId: "ENT-01", createdBy: "Operator Admin", createdAt: "2026-07-01" },
  { code: "MAT-03", name: "Hydraulic oil", type: "chemical", category: "E", unit: "litre", weightKg: 0.9, consumable: true, hazardous: true, entityId: "ENT-01", createdBy: "Operator Admin", createdAt: "2026-07-02" },
  { code: "MAT-04", name: "Crew meal trays", type: "food", category: "C", unit: "nos", weightKg: 0.6, consumable: true, hazardous: false, entityId: "ENT-02", createdBy: "Caterer", createdAt: "2026-07-02" },
  { code: "MAT-05", name: "Cleaning detergent", type: "consumable", category: "E", unit: "litre", weightKg: 1.0, consumable: true, hazardous: false, entityId: "ENT-02", createdBy: "Caterer", createdAt: "2026-07-03" },
];

export const MATERIAL_MOVES: MaterialMove[] = [
  { id: "MOV-06", code: "MAT-04", entityId: "ENT-02", requestId: "TOT-2202", direction: "consumed", quantity: 120, unit: "nos", carrier: "P. Nair", carrierId: "IND-05", ts: "2026-07-05 11:00", by: "Entity", reason: "consumed", remarks: "Loaded to aircraft galley" },
  { id: "MOV-05", code: "MAT-04", entityId: "ENT-02", requestId: "TOT-2202", direction: "in", quantity: 120, unit: "nos", gate: "G5", carrier: "P. Nair", carrierId: "IND-05", ts: "2026-07-05 06:30", by: "CISF Gate" },
  { id: "MOV-04", code: "MAT-03", entityId: "ENT-01", requestId: "TOT-2201", direction: "consumed", quantity: 3, unit: "litre", carrier: "V. Singh", carrierId: "IND-07", ts: "2026-07-05 14:00", by: "Entity", reason: "consumed", remarks: "Used on A320 hydraulics" },
  { id: "MOV-03", code: "MAT-03", entityId: "ENT-01", requestId: "TOT-2201", direction: "in", quantity: 5, unit: "litre", gate: "G3", carrier: "V. Singh", carrierId: "IND-07", ts: "2026-07-05 08:12", by: "CISF Gate" },
  { id: "MOV-02", code: "MAT-01", entityId: "ENT-01", requestId: "TOT-2201", direction: "out", quantity: 1, unit: "box", gate: "G3", carrier: "V. Singh", carrierId: "IND-07", ts: "2026-07-05 17:40", by: "CISF Gate" },
  { id: "MOV-01", code: "MAT-01", entityId: "ENT-01", requestId: "TOT-2201", direction: "in", quantity: 1, unit: "box", gate: "G3", carrier: "V. Singh", carrierId: "IND-07", ts: "2026-07-05 08:10", by: "CISF Gate", remarks: "AME line maintenance" },
];
