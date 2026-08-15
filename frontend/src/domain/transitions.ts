// ---------------------------------------------------------------------------
// Application status machine — the forward actions available from each state,
// gated by role. This is what makes a raised pass fully drivable in-app:
// Pass Section (Operator) works the checklist and issues; BCAS decides at
// committee; the Entity resubmits clarifications and surrenders. Every action
// carries its governing clause (AVSEC Order 02/2022).
// ---------------------------------------------------------------------------

import type { ApplicationStatus, Role, Pillar } from "./types";

export interface Transition {
  to: ApplicationStatus;
  label: string;
  roles: Role[];
  tone: "brand" | "green" | "amber" | "red" | "ghost";
  needsNote?: boolean; // prompt for a mandatory reason before committing
  clause?: string;
}

/** Role-gated forward actions available from each application status. */
export const TRANSITIONS: Partial<Record<ApplicationStatus, Transition[]>> = {
  checklist_pending: [
    { to: "committee_scheduled", label: "Forward to committee", roles: ["operator", "admin"], tone: "brand", clause: "§8.3.3" },
    { to: "clarification", label: "Send for clarification", roles: ["operator", "admin"], tone: "amber", needsNote: true, clause: "§8.3.2" },
    { to: "rejected", label: "Reject", roles: ["operator", "admin"], tone: "red", needsNote: true, clause: "§8.3.2" },
  ],
  clarification: [
    { to: "checklist_pending", label: "Resubmit for verification", roles: ["operator", "admin", "entity", "others"], tone: "brand", clause: "§8.3.2" },
  ],
  committee_scheduled: [
    { to: "approved", label: "Approve at committee", roles: ["bcas", "admin"], tone: "green", clause: "§8.3.3" },
    { to: "rejected", label: "Reject", roles: ["bcas", "admin"], tone: "red", needsNote: true, clause: "§8.3.3" },
  ],
  approved: [
    { to: "issued", label: "Issue & print pass", roles: ["operator", "admin"], tone: "brand", clause: "§15" },
  ],
  issued: [
    { to: "parked", label: "Park (non-use)", roles: ["operator", "admin"], tone: "amber", needsNote: true, clause: "§10.6" },
    { to: "deactivated", label: "Deactivate (compliance hold)", roles: ["operator", "admin", "bcas"], tone: "amber", needsNote: true, clause: "§10 · §13" },
    { to: "withdrawn", label: "Withdraw (adverse BGC / cancel)", roles: ["bcas", "admin"], tone: "red", needsNote: true, clause: "§11" },
    { to: "surrendered", label: "Surrender pass", roles: ["operator", "admin", "entity", "others"], tone: "ghost", needsNote: true, clause: "§10.7" },
  ],
  parked: [
    { to: "issued", label: "Un-park & reinstate", roles: ["operator", "admin"], tone: "brand", clause: "§10.6" },
    { to: "withdrawn", label: "Withdraw (cancel)", roles: ["bcas", "admin"], tone: "red", needsNote: true, clause: "§11" },
    { to: "surrendered", label: "Surrender pass", roles: ["operator", "admin", "entity", "others"], tone: "ghost", needsNote: true, clause: "§10.7" },
  ],
  deactivated: [
    { to: "issued", label: "Reactivate", roles: ["operator", "admin", "bcas"], tone: "brand", clause: "§10 · §13" },
    { to: "withdrawn", label: "Withdraw (cancel)", roles: ["bcas", "admin"], tone: "red", needsNote: true, clause: "§11" },
  ],
};

// MATERIAL (ToT · §12B) does NOT go to committee. Pass Section verifies, then
// forwards to an authorised signatory (Pass Section IC / CSO / CAO) who approves
// — after which the material may be carried. The committee_scheduled status is
// reused as the "pending signatory approval" state for this pillar.
const MATERIAL_OVERRIDES: Partial<Record<ApplicationStatus, Transition[]>> = {
  checklist_pending: [
    { to: "committee_scheduled", label: "Forward to signatory (IC/CSO/CAO)", roles: ["operator", "admin"], tone: "brand", clause: "§12B" },
    { to: "clarification", label: "Send for clarification", roles: ["operator", "admin"], tone: "amber", needsNote: true, clause: "§8.3.2" },
    { to: "rejected", label: "Reject", roles: ["operator", "admin"], tone: "red", needsNote: true, clause: "§8.3.2" },
  ],
  committee_scheduled: [
    { to: "approved", label: "Approve ToT — IC / CSO / CAO", roles: ["admin"], tone: "green", clause: "§12B" },
    { to: "rejected", label: "Reject", roles: ["admin"], tone: "red", needsNote: true, clause: "§12B" },
  ],
};

/** Forward actions a given role may take from a given status, for a given pillar. */
export function transitionsFor(status: ApplicationStatus, role: Role, pillar?: Pillar): Transition[] {
  const table = pillar === "MATERIAL" && MATERIAL_OVERRIDES[status] ? MATERIAL_OVERRIDES[status] : TRANSITIONS[status];
  return (table ?? []).filter((t) => t.roles.includes(role));
}
