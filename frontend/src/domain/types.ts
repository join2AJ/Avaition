// ---------------------------------------------------------------------------
// AEP Portal domain model — mirrors the FastAPI backend and the BCAS AEP
// Guidelines 2022 (AVSEC Order 02/2022). One Entity registers ONCE and raises
// applications across all three pillars; every pillar shares that same Entity
// record, so there is never a second registration for MATERIAL or VEHICLE.
// ---------------------------------------------------------------------------

/** The three permit pillars. */
export type Pillar = "MAN" | "MATERIAL" | "VEHICLE";

export const PILLARS: { key: Pillar; roman: string; label: string; pass: string; clause: string }[] = [
  { key: "MAN", roman: "I", label: "Man", pass: "AEP", clause: "§5 · §10 · §11" },
  { key: "MATERIAL", roman: "II", label: "Material", pass: "ToT", clause: "§12B" },
  { key: "VEHICLE", roman: "III", label: "Vehicle", pass: "VEP", clause: "§12A" },
];

export type Role = "admin" | "operator" | "bcas" | "cisf" | "entity" | "others" | "individual";

export interface RoleMeta {
  key: Role;
  title: string;
  tag: string;
  accent: string; // css color token name
  blurb: string;
}

export type ApplicationStatus =
  | "draft"
  | "checklist_pending"
  | "clarification"
  | "committee_scheduled"
  | "approved"
  | "rejected"
  | "issued"
  | "parked"        // §10.6 — 60-day non-use suspension (reversible within norms)
  | "deactivated"   // compliance hold, e.g. AVSEC-training lapse (§10 · §13) — reversible
  | "withdrawn"     // §11 — permanent cancellation (adverse BGC / disciplinary)
  | "surrendered";

export type EntityStatus = "active" | "suspended" | "archived";

/** Pass types vary by pillar. */
export type PassType = "BAEP" | "TAEP" | "VAT" | "Permanent" | "ToT" | "VEP" | "VAP" | "ADP";

export interface GuidelineClause {
  order_no: string;
  clause: string;
  sub_clause?: string;
  description: string;
}

export type ApprovalStage = "registration" | "documentation" | "matrix" | "verification" | "bcas_approved";
export const APPROVAL_STAGES: { key: ApprovalStage; label: string }[] = [
  { key: "registration", label: "Registration" },
  { key: "documentation", label: "Documentation" },
  { key: "matrix", label: "Defining matrix" },
  { key: "verification", label: "Verification" },
  { key: "bcas_approved", label: "BCAS approved" },
];

export interface Contract {
  id: string;               // CON-01
  entityId: string;
  counterparty: string;     // company / airport operator the contract is with
  type: string;             // LOI / LOA / PO / SO / Work Order
  start: string;
  end: string;
  copyFileName?: string;
  scope: string;            // functional scope (drives allowed zones)
  status: "active" | "terminated" | "expired";
}

export interface Notification {
  id: string;
  ts: string;
  to: string;               // audience: entity / bcas / individual / operator
  type: string;
  message: string;
  tone: "ok" | "warn" | "bad";
  read: boolean;
}

export interface Signatory { name: string; designation: string; certifiedBy: string; dsc?: string; }
export interface EntityDoc { name: string; reference?: string; expiry?: string; fileName?: string; }
export interface EntityJobRole { role: string; zones: string[]; justification: string; }

export interface Entity {
  id: string;
  name: string;
  category: string; // AEP category: GHA, Airline, Caterer, Cargo/CHA, MRO, Govt, Contractor…
  status: EntityStatus;
  strength: number; // registered active individuals; >15 unlocks self-service login
  contractStart: string;
  contractEnd: string;
  aopLinked: boolean;
  entitledZones: string[]; // zone codes granted at onboarding / renewal
  signatories?: Signatory[];
  docs?: EntityDoc[];
  jobRoles?: EntityJobRole[];
  approvalStage?: ApprovalStage;
}

export interface Individual {
  id: string;
  entityId: string;
  name: string;
  jobRole: string;
  hasLogin: boolean; // entity may authorize a self-check login
  state?: string;
  district?: string;
  religion?: string;
  bloodGroup?: string;
  zones?: string[];
  avsecTrainingExpiry?: string; // AVSEC awareness/refresher validity — 1 year (§13)
}

export interface StepLog {
  stage: string;
  at: string;        // timestamp the step was completed / entered
  by?: string;
  slaNote?: string;  // mandatory justification recorded when the step's SLA was breached
  note?: string;     // reason attached to a status transition (clarification / rejection / surrender)
  action?: string;   // the transition label, e.g. "Forward to committee"
}

/** Polymorphic subject of an application — the shared Entity is always the sponsor. */
export interface Application {
  id: string; // APP-2216
  pillar: Pillar;
  entityId: string;
  contractId?: string; // the contract this pass is raised under
  subject: string; // person name (MAN) / item (MATERIAL) / vehicle (VEHICLE)
  jobRole?: string; // MAN — drives zone-need
  passType: PassType;
  zones: string[]; // requested zone codes
  status: ApplicationStatus;
  createdBy: string;
  createdAt: string;   // date only
  createdAtTs?: string; // date + time the pass was raised (SLA clock start)
  validFrom?: string;
  validTo?: string;     // "to" date, computed per norms
  stepLog?: StepLog[];  // timestamped trail of steps taken
  expiryDate?: string;
  clauseRef: string;
}

export interface ZoneDef {
  code: string;
  label: string;
  sra: boolean; // Security Restricted Area
}

export interface KpiTile {
  label: string;
  value: number | string;
  accent: string;
  hint?: string;
}
