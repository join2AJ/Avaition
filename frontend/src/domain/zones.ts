import type { ZoneDef } from "./types";

// Zone codes per AEP Guidelines 02/2022 (§ need-to-access). SRA = Security
// Restricted Area (tighter vetting). Airport-specific "X" covered by RD BCAS.
export const ZONES: ZoneDef[] = [
  { code: "A", label: "Arrival Hall", sra: false },
  { code: "D", label: "Departure Hall", sra: false },
  { code: "T", label: "Terminal Building (excl. SHA/Customs/Immigration)", sra: false },
  { code: "Sd", label: "Security Hold Area — Domestic", sra: true },
  { code: "Si", label: "Security Hold Area — International", sra: true },
  { code: "P", label: "Apron Area", sra: true },
  { code: "B", label: "Baggage Handling Area", sra: true },
  { code: "F", label: "ATC Building (except Tower)", sra: true },
  { code: "Ft", label: "ATC Tower + Building", sra: true },
  { code: "Cd", label: "Cargo Terminal — Domestic", sra: false },
  { code: "Ci", label: "Cargo Terminal — International", sra: false },
  { code: "Csd", label: "Cargo SHA — Domestic", sra: true },
  { code: "Csi", label: "Cargo SHA — International", sra: true },
  { code: "I", label: "Boarding gates → Immigration / Baggage claim", sra: false },
  { code: "Os", label: "Other Special", sra: true },
  { code: "X", label: "Any other area (RD BCAS approval)", sra: true },
];

export const ZONE_LABEL: Record<string, string> = Object.fromEntries(
  ZONES.map((z) => [z.code, z.label]),
);

export function isSra(code: string): boolean {
  return ZONES.find((z) => z.code === code)?.sra ?? false;
}
