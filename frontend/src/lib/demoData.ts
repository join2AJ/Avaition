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
  { id: "IND-01", entityId: "ENT-01", name: "R. Sharma", jobRole: "Ramp Agent", hasLogin: true },
  { id: "IND-02", entityId: "ENT-01", name: "M. Iyer", jobRole: "Baggage Handler", hasLogin: false },
  { id: "IND-03", entityId: "ENT-03", name: "S. Khan", jobRole: "Catering Loader", hasLogin: true },
  { id: "IND-04", entityId: "ENT-04", name: "D. Rao", jobRole: "Fuel Technician", hasLogin: false },
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

export interface AuditEntry { ts: string; actor: string; action: string; object: string; detail: string; tone: "ok" | "warn" | "bad"; }
export const AUDIT: AuditEntry[] = [
  { ts: "2026-07-05 09:41", actor: "system", action: "sync", object: "AEP register", detail: "2,140 holders reconciled", tone: "ok" },
  { ts: "2026-07-05 10:14", actor: "Pass Section", action: "issue", object: "TOT-0912", detail: "ToT card issued · zone P", tone: "ok" },
  { ts: "2026-07-05 11:02", actor: "Pass Section", action: "send_to_clarification", object: "APP-2240", detail: "BGC older than 3 months · SLA 2 WD", tone: "warn" },
  { ts: "2026-07-05 11:30", actor: "Pass Section", action: "schedule_committee", object: "APP-2256", detail: "CMTE-07 · 2026-07-09", tone: "ok" },
  { ts: "2026-07-05 11:47", actor: "BCAS", action: "late_surrender_flag", object: "APP-2244", detail: "9 days late · entity notified", tone: "bad" },
  { ts: "2026-07-05 12:03", actor: "Admin", action: "access_policy", object: "BCAS pillars", detail: "MATERIAL kept hidden", tone: "ok" },
];

export const APPLICATIONS: Application[] = [
  { id: "APP-2216", pillar: "MAN", entityId: "ENT-01", subject: "R. Sharma", passType: "BAEP", zones: ["A", "D", "T"], status: "checklist_pending", createdBy: "Pass Section", createdAt: "2026-07-05", clauseRef: "§5" },
  { id: "APP-2231", pillar: "MAN", entityId: "ENT-01", subject: "M. Iyer", passType: "BAEP", zones: ["A", "D", "T", "P", "Sd"], status: "checklist_pending", createdBy: "Entity", createdAt: "2026-07-05", clauseRef: "§5" },
  { id: "APP-2240", pillar: "MAN", entityId: "ENT-03", subject: "S. Khan", passType: "TAEP", zones: ["T"], status: "clarification", createdBy: "Pass Section", createdAt: "2026-07-04", clauseRef: "§8.3.3" },
  { id: "APP-2244", pillar: "MAN", entityId: "ENT-04", subject: "D. Rao", passType: "BAEP", zones: ["P", "T"], status: "approved", createdBy: "Entity", createdAt: "2026-07-03", clauseRef: "§5" },
  { id: "APP-2247", pillar: "MATERIAL", entityId: "ENT-01", subject: "AME Toolkit · V. Singh", passType: "ToT", zones: ["P"], status: "checklist_pending", createdBy: "Entity", createdAt: "2026-07-05", clauseRef: "§12B" },
  { id: "APP-2248", pillar: "VEHICLE", entityId: "ENT-01", subject: "DL-1GC-4471 · pushback tug", passType: "VEP", zones: ["P"], status: "checklist_pending", createdBy: "Entity", createdAt: "2026-07-05", clauseRef: "§12A" },
  { id: "APP-2256", pillar: "MAN", entityId: "ENT-02", subject: "P. Nair", passType: "BAEP", zones: ["T", "Si"], status: "committee_scheduled", createdBy: "Entity", createdAt: "2026-07-02", clauseRef: "§5" },
  { id: "APP-2257", pillar: "MATERIAL", entityId: "ENT-02", subject: "Catering hi-loader", passType: "ToT", zones: ["P"], status: "checklist_pending", createdBy: "Entity", createdAt: "2026-07-05", clauseRef: "§12B" },
  { id: "APP-2258", pillar: "VEHICLE", entityId: "ENT-05", subject: "MH-04-CV-2231 · cargo van", passType: "VEP", zones: ["Cd"], status: "issued", createdBy: "Pass Section", createdAt: "2026-06-28", expiryDate: "2026-07-22", clauseRef: "§12A" },
  { id: "APP-2259", pillar: "MAN", entityId: "ENT-05", subject: "A. Reddy", passType: "TAEP", zones: ["Cd", "Csd"], status: "issued", createdBy: "Pass Section", createdAt: "2026-06-25", expiryDate: "2026-07-19", clauseRef: "§5" },
  { id: "APP-2260", pillar: "MAN", entityId: "ENT-03", subject: "N. Gupta", passType: "TAEP", zones: ["T"], status: "rejected", createdBy: "Pass Section", createdAt: "2026-06-30", clauseRef: "§5" },
];
