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
  { id: "IND-05", entityId: "ENT-02", name: "P. Nair", jobRole: "Security Screener", hasLogin: false, state: "Kerala", district: "Kochi", religion: "Christian", bloodGroup: "O-", zones: ["T", "Si", "P"], avsecTrainingExpiry: "2026-07-30" },
  { id: "IND-06", entityId: "ENT-05", name: "A. Reddy", jobRole: "Cargo Handler", hasLogin: false, state: "Andhra Pradesh", district: "Vijayawada", religion: "Hindu", bloodGroup: "B-", zones: ["Cd", "Csd"], avsecTrainingExpiry: "2026-05-15" },
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
  id: string; applicationId: string; holder: string; entityId: string; reason: "terminated" | "expired" | "deceased";
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
  { ts: "2026-07-05 12:20", actor: "CISF Gate Officer", role: "cisf", action: "verify", object: "APP-2258", detail: "VEP verified at gate · match", tone: "ok" },
  { ts: "2026-07-05 12:35", actor: "GHA-Delta Ground Services", role: "entity", action: "create_application", object: "APP-2247", detail: "MATERIAL · ToT raised", tone: "ok" },
];

export const APPLICATIONS: Application[] = [
  { id: "APP-2216", pillar: "MAN", entityId: "ENT-01", subject: "R. Sharma", passType: "BAEP", zones: ["A", "D", "T"], status: "checklist_pending", createdBy: "Pass Section", createdAt: "2026-07-05", clauseRef: "§5" },
  { id: "APP-2231", pillar: "MAN", entityId: "ENT-01", subject: "M. Iyer", passType: "BAEP", zones: ["A", "D", "T", "P", "Sd"], status: "checklist_pending", createdBy: "Entity", createdAt: "2026-07-05", clauseRef: "§5" },
  { id: "APP-2240", pillar: "MAN", entityId: "ENT-03", subject: "S. Khan", passType: "TAEP", zones: ["T"], status: "clarification", createdBy: "Pass Section", createdAt: "2026-07-04", clauseRef: "§8.3.3" },
  { id: "APP-2244", pillar: "MAN", entityId: "ENT-04", subject: "D. Rao", passType: "BAEP", zones: ["P", "T"], status: "approved", createdBy: "Entity", createdAt: "2026-07-03", clauseRef: "§5" },
  { id: "APP-2247", pillar: "MATERIAL", entityId: "ENT-01", subject: "AME Toolkit · V. Singh", passType: "ToT", zones: ["P"], escort: "R. Sharma", status: "checklist_pending", createdBy: "Entity", createdAt: "2026-07-05", clauseRef: "§12B" },
  { id: "APP-2248", pillar: "VEHICLE", entityId: "ENT-01", subject: "DL-1GC-4471 · pushback tug", passType: "VEP", zones: ["P"], status: "checklist_pending", createdBy: "Entity", createdAt: "2026-07-05", clauseRef: "§12A" },
  { id: "APP-2256", pillar: "MAN", entityId: "ENT-02", subject: "P. Nair", passType: "BAEP", zones: ["T", "Si"], status: "committee_scheduled", createdBy: "Entity", createdAt: "2026-07-02", clauseRef: "§5" },
  { id: "APP-2257", pillar: "MATERIAL", entityId: "ENT-02", subject: "Catering hi-loader", passType: "ToT", zones: ["P"], escort: "P. Nair", status: "checklist_pending", createdBy: "Entity", createdAt: "2026-07-05", clauseRef: "§12B" },
  { id: "APP-2258", pillar: "VEHICLE", entityId: "ENT-05", subject: "MH-04-CV-2231 · cargo van", passType: "VEP", zones: ["Cd"], status: "issued", createdBy: "Pass Section", createdAt: "2026-06-28", expiryDate: "2026-07-22", clauseRef: "§12A" },
  { id: "APP-2259", pillar: "MAN", entityId: "ENT-05", subject: "A. Reddy", passType: "TAEP", zones: ["Cd", "Csd"], status: "issued", createdBy: "Pass Section", createdAt: "2026-06-25", expiryDate: "2026-07-19", clauseRef: "§5" },
  { id: "APP-2260", pillar: "MAN", entityId: "ENT-03", subject: "N. Gupta", passType: "TAEP", zones: ["T"], status: "rejected", createdBy: "Pass Section", createdAt: "2026-06-30", clauseRef: "§5" },
  { id: "APP-2261", pillar: "MAN", entityId: "ENT-01", subject: "K. Menon", passType: "BAEP", zones: ["A", "T"], status: "parked", createdBy: "Pass Section", createdAt: "2026-04-20", expiryDate: "2027-04-19", clauseRef: "§5",
    stepLog: [{ stage: "handover", at: "2026-04-20 10:15", by: "Pass Section Staff", action: "Issue & print pass" }, { stage: "handover", at: "2026-06-22 09:40", by: "Pass Section Staff", action: "Park (non-use)", note: "No swipe for 60 days — parked pending re-confirmation (§10.6)" }] },
  { id: "APP-2262", pillar: "MAN", entityId: "ENT-04", subject: "B. Kulkarni", passType: "BAEP", zones: ["P", "T"], status: "withdrawn", createdBy: "Pass Section", createdAt: "2026-03-10", clauseRef: "§5",
    stepLog: [{ stage: "handover", at: "2026-03-10 11:00", by: "Pass Section Staff", action: "Issue & print pass" }, { stage: "closed", at: "2026-06-28 16:20", by: "BCAS Officer", action: "Withdraw (adverse BGC / cancel)", note: "Adverse police verification received — pass withdrawn (§11)" }] },
];
