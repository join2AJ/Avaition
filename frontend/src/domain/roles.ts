import type { RoleMeta, Role } from "./types";

// Five sign-in roles + the individual self-check login. Admin spans both the
// Airport Operator and BCAS; Operator and BCAS each have their own AEP staff.
export const ROLES: RoleMeta[] = [
  {
    key: "admin",
    title: "Admin — Airport Operator + BCAS",
    tag: "SUPER USER",
    accent: "var(--role-admin)",
    blurb: "Creates entities, users, zones & checklists. Every creation carries a governing policy reference.",
  },
  {
    key: "bcas",
    title: "BCAS — Regulator (AEP Staff)",
    tag: "OVERSIGHT",
    accent: "var(--role-bcas)",
    blurb: "Reads everything. Overrides zones, raises queries & penalties with written justification.",
  },
  {
    key: "operator",
    title: "Pass Section — Airport Operator (AEP Staff)",
    tag: "THE COUNTER",
    accent: "var(--role-operator)",
    blurb: "Verifies checklists, runs clarifications, schedules committees, prints & issues cards.",
  },
  {
    key: "cisf",
    title: "CISF — Gate Verification",
    tag: "VERIFY ONLY",
    accent: "var(--role-cisf)",
    blurb: "Search a pass number (AEP · protocol · ToT · VAP/ADP) to verify details against the physical card at the gate.",
  },
  {
    key: "entity",
    title: "Entity (> 15 persons)",
    tag: "SELF-SERVICE",
    accent: "var(--role-entity)",
    blurb: "Files applications for own personnel across all pillars; tracks Programme, Clearance & contract.",
  },
  {
    key: "others",
    title: "Others — Contractor / Govt",
    tag: "SCOPED",
    accent: "var(--role-others)",
    blurb: "Category-specific checklist flow for own applications only. Below 15 persons: via Pass Section.",
  },
];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin · Operator + BCAS",
  bcas: "BCAS · Oversight",
  operator: "Pass Section · Operator",
  cisf: "CISF · Gate Verify",
  entity: "Entity",
  others: "Others",
  individual: "Individual · Self-check",
};
