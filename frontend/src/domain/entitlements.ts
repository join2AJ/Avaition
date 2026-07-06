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
 * BAEP max 3y, TAEP max 30d, VAT 4h, ToT/VAP/ADP max 1y (§7 · §14).
 */
export function computeValidTo(passType: PassType, from: string, contractEnd?: string): { to: string; norm: string; cappedByContract: boolean } {
  const d = new Date(from);
  const add = (days: number) => {
    const x = new Date(d); x.setDate(x.getDate() + days); return x.toISOString().slice(0, 10);
  };
  let to: string, norm: string;
  switch (passType) {
    case "BAEP":
    case "Permanent": to = add(365 * 3); norm = "max 3 years · co-terminus with clearance / NSOP-AOP / contract"; break;
    case "TAEP": to = add(30); norm = "max 30 days · annual cap 30 days"; break;
    case "VAT": to = from; norm = "4 hours · single use"; break;
    case "ToT": to = add(365); norm = "co-terminus with holder AEP · max 1 year"; break;
    case "VAP": to = add(365); norm = "max 1 year · non-transferable"; break;
    default: to = add(365); norm = "max 1 year"; break;
  }
  // Co-terminus rule (§7A): the pass must expire on the earliest of its norm and
  // the contract end — a pass can never outlive the entity's contract.
  let cappedByContract = false;
  if (contractEnd && contractEnd < to) { to = contractEnd; cappedByContract = true; }
  return { to, norm, cappedByContract };
}

/** Today as yyyy-mm-dd, used to block back-dating for non-admin roles. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
