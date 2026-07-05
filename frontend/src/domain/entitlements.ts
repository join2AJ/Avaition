import type { PassType } from "./types";

// Job-role → zone-need matrix (AVSEC 02/2022 need-to-access). Selecting an
// entity + role auto-gives the zone set; the union of entity-entitled zones
// and role-need zones is proposed, still subject to the entity's contract.
export const ROLE_ZONES: Record<string, string[]> = {
  "Ramp Agent": ["A", "D", "P"],
  "Baggage Handler": ["A", "D", "B"],
  "Catering Loader": ["T", "P"],
  "Fuel Technician": ["P", "T"],
  "Security Screener": ["T", "Sd", "Si", "P"],
  "Cargo Handler": ["Cd", "Ci", "Csd"],
  "ATC Support Engineer": ["F", "Ft"],
};

export const JOB_ROLES = Object.keys(ROLE_ZONES);

/**
 * Validity ("to" date) is computed per pass-type norms, never typed by hand.
 * BAEP max 3y, TAEP max 30d, VAT 4h, ToT/VEP/VAP/ADP max 1y (§7 · §14).
 */
export function computeValidTo(passType: PassType, from: string): { to: string; norm: string } {
  const d = new Date(from);
  const add = (days: number) => {
    const x = new Date(d); x.setDate(x.getDate() + days); return x.toISOString().slice(0, 10);
  };
  switch (passType) {
    case "BAEP":
    case "Permanent": return { to: add(365 * 3), norm: "max 3 years · co-terminus with clearance / contract" };
    case "TAEP": return { to: add(30), norm: "max 30 days · annual cap 30 days" };
    case "VAT": return { to: from, norm: "4 hours · single use" };
    case "ToT": return { to: add(365), norm: "co-terminus with holder AEP · max 1 year" };
    case "VEP": return { to: add(365), norm: "max 1 year · non-transferable" };
    default: return { to: add(365), norm: "max 1 year" };
  }
}

/** Today as yyyy-mm-dd, used to block back-dating for non-admin roles. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
