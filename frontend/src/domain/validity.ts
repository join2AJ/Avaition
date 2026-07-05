// Pass validity is driven by TWO norms: a central regulatory norm (from the
// guidelines) and a local / aerodrome-operator norm. The local norm can only
// DECREASE validity, never exceed the central cap. BCAS may, on request +
// justification, grant an exemption and permit pass printing beyond the local
// norm. Material passes additionally carry a direction (Entry / Exit / Both).

export type Direction = "entry" | "exit" | "both";

export interface ValidityNorm {
  passType: string;
  family: "MAN" | "MATERIAL" | "VEHICLE";
  centralDays: number;     // central regulatory cap (days)
  centralLabel: string;
  authority: string;       // who sets the local norm
  hasDirection?: boolean;  // material passes carry Entry/Exit/Both
}

export const CENTRAL_NORMS: ValidityNorm[] = [
  { passType: "BAEP / PAEP", family: "MAN", centralDays: 1095, centralLabel: "max 3 years", authority: "Local regulatory (RD BCAS)" },
  { passType: "TAEP", family: "MAN", centralDays: 30, centralLabel: "max 30 days", authority: "Local regulatory (Airport Operator)" },
  { passType: "VAT", family: "MAN", centralDays: 1, centralLabel: "4 hours · single use", authority: "Local regulatory (Airport Operator)" },
  { passType: "ADP / VAP", family: "VEHICLE", centralDays: 365, centralLabel: "max 1 year", authority: "Local regulatory (Airport Operator)" },
  { passType: "VEP", family: "VEHICLE", centralDays: 365, centralLabel: "max 1 year · non-transferable", authority: "Local regulatory (Airport Operator)" },
  { passType: "Material — 1-day ToT", family: "MATERIAL", centralDays: 1, centralLabel: "single day", authority: "Aerodrome Operator", hasDirection: true },
  { passType: "Material — ToT (quarterly)", family: "MATERIAL", centralDays: 90, centralLabel: "max quarterly", authority: "Aerodrome Operator", hasDirection: true },
];

export const DIRECTION_LABEL: Record<Direction, string> = { entry: "Entry only", exit: "Exit only", both: "Entry / Exit" };
