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
