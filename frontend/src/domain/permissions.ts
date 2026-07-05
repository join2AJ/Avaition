// Roles + per-vertical CRUD, editable at runtime. Admin (either kind), Pass
// Section Operator and BCAS may create new roles; a freshly-created custom role
// starts with NO access and is flagged to BCAS until access is assigned.

export const VERTICALS = ["Entities", "Individuals", "Committees", "Zones", "Documents", "Reports", "Penalties"] as const;
export type Vertical = (typeof VERTICALS)[number];
export type Crud = { c: boolean; r: boolean; u: boolean; d: boolean };
export type PermMatrix = Record<Vertical, Crud>;

export interface RoleDef {
  key: string;
  label: string;
  custom: boolean;               // created in-app (vs a built-in role)
  assigned: boolean;             // BCAS has assigned access (custom roles start false)
  perms: PermMatrix;
}

const none = (): PermMatrix =>
  Object.fromEntries(VERTICALS.map((v) => [v, { c: false, r: false, u: false, d: false }])) as PermMatrix;

const P = (spec: Partial<Record<Vertical, string>>): PermMatrix => {
  const m = none();
  for (const [v, s] of Object.entries(spec)) {
    m[v as Vertical] = { c: s.includes("C"), r: s.includes("R"), u: s.includes("U"), d: s.includes("D") };
  }
  return m;
};

// Baseline matrix per AVSEC 02/2022 §2.
export const BASE_ROLES: RoleDef[] = [
  { key: "admin", label: "Admin (Operator + BCAS)", custom: false, assigned: true, perms: P({
    Entities: "CRUD", Individuals: "CRUD", Committees: "CRUD", Zones: "CRUD", Documents: "CRUD", Reports: "CRUD", Penalties: "CRUD" }) },
  { key: "bcas", label: "BCAS — Oversight", custom: false, assigned: true, perms: P({
    Entities: "RU", Individuals: "R", Committees: "R", Zones: "RU", Documents: "R", Reports: "R", Penalties: "CRU" }) },
  { key: "operator", label: "Pass Section — Operator", custom: false, assigned: true, perms: P({
    Entities: "CRU", Individuals: "CRU", Committees: "CRU", Zones: "CR", Documents: "CRU", Reports: "R", Penalties: "R" }) },
  { key: "entity", label: "Entity", custom: false, assigned: true, perms: P({
    Entities: "R", Individuals: "CR", Committees: "R", Zones: "CR", Documents: "CR", Reports: "R", Penalties: "R" }) },
  { key: "others", label: "Others — Contractor / Govt", custom: false, assigned: true, perms: P({
    Individuals: "CR", Committees: "R", Zones: "CR", Documents: "CR", Penalties: "R" }) },
  { key: "cisf", label: "CISF — Gate Verify", custom: false, assigned: true, perms: P({ Individuals: "R", Documents: "R" }) },
  { key: "individual", label: "Individual — Self-check", custom: false, assigned: true, perms: P({ Individuals: "R", Documents: "R" }) },
];

export function newRole(label: string): RoleDef {
  return { key: `custom_${label.toLowerCase().replace(/\s+/g, "_")}`, label, custom: true, assigned: false, perms: none() };
}
