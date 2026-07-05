// Document checklists per AVSEC 02/2022 §4 — what an entity / individual must
// obtain to get each pass. Used by the Checklist reference page.

export interface DocItem { name: string; note?: string; clause?: string; taep?: boolean; baep?: boolean; }
export interface ChecklistGroup { title: string; scope: "entity" | "individual" | "material" | "vehicle"; items: DocItem[]; }

export const ENTITY_DOCS: DocItem[] = [
  { name: "Forwarding / Request Letter on official letterhead", note: "AS name, designation, employee count, entity reg. details", clause: "§4A.1" },
  { name: "BCAS-approved Security Clearance (or Provisional)", note: "issued by RD BCAS · # + expiry", clause: "§4A.2" },
  { name: "BCAS-approved Security Programme", note: "approved by BCAS HQ or RD", clause: "§4A.3" },
  { name: "Contract / Agreement (LOI / LOA / PO / SO / Work Order)", clause: "§4A.4" },
  { name: "Authorized Signatory Form", note: "certified by MD/CEO/CSO · original signature · max 5 per entity per airport", clause: "§4A.5" },
  { name: "DSC of Authorized Signatory", note: "required if > 15 employees (e-Sahaj)", clause: "§4A.6" },
  { name: "Updated employee list (Security Programme)", note: "update within 1 week of any change", clause: "§4A.7" },
];

export const INDIVIDUAL_DOCS: DocItem[] = [
  { name: "AEP Application Form (AEPAF)", note: "BLOCK LETTERS, black ink · no alterations/photocopies · signed by applicant + AS with seal", clause: "§4B.1", taep: true, baep: true },
  { name: "Aadhaar Card — m-Aadhaar / DigiLocker verified", note: "plain photocopy not acceptable", clause: "§4B.2", taep: true, baep: true },
  { name: "One additional Photo ID", note: "Voter ID / DL / PAN+address / Passport (≤5 yrs) — must match Aadhaar", clause: "§4B.3", taep: true, baep: true },
  { name: "Address Proof", note: "recent bill / bank passbook / RC — must match form", clause: "§4B.4", taep: true, baep: true },
  { name: "Appointment / Joining / Transfer / Deputation Letter", clause: "§4B.5", taep: true, baep: true },
  { name: "AEP Possession / Undertaking Form", note: "first-ever issuance in the entity", clause: "§4B.6", taep: true, baep: true },
  { name: "2 Passport photographs", note: "white bg · 70% face · no goggles/headgear (Sikh turban exempt) · 3.5×4.5 cm", clause: "§4B.8", taep: true, baep: true },
  { name: "Applicant Undertaking (Para 11.3)", note: "no criminal/civil case pending", clause: "§11.3", taep: true, baep: true },
  { name: "NCRC Excel (hard + soft copy)", clause: "§4B.11", taep: true, baep: true },
  { name: "Police BGC Final Report (or Applied + undertaking)", note: "BAEP only · initiated by RD BCAS within 7 days", clause: "§4C.A", baep: true },
  { name: "AVSEC Awareness Training Certificate", note: "BAEP only · valid 1 year · annual refresher for 3-yr AEP", clause: "§4C.B", baep: true },
  { name: "C&A (Character & Antecedent) Verification Form", note: "BAEP only · submitted by AS", clause: "§4C.C", baep: true },
];

export const MATERIAL_DOCS: DocItem[] = [
  { name: "ToT Approval Card request", note: "separate from AEP · carried with AEP at all times", clause: "§12B" },
  { name: "Controlled tool category (Annexure C · A–G)", note: "firearms / stunning / sharp>6cm / tradesman / blunt / explosives / liquids-gels" },
  { name: "Holder's valid AEP with the target SRA zone", note: "material can only enter a zone the escorting holder is entitled to" },
  { name: "Purpose & duration of carriage", note: "operational / maintenance justification" },
];

export const VEHICLE_DOCS: DocItem[] = [
  { name: "Driver Airside Driving Permit (ADP)", note: "apply FIRST · driver must hold ADP or be escorted by an ADP holder", clause: "§14" },
  { name: "Registration Certificate (RC) — original carried", clause: "§14" },
  { name: "Pollution (PUC) Certificate", clause: "§14" },
  { name: "Fitness Certificate", clause: "§14" },
  { name: "Speed Governor Certificate", clause: "§14" },
  { name: "VEP application (Vehicle Entry Permit)", note: "max 1 year · non-transferable · displayed on vehicle front · RFID tag post-deployment", clause: "§12A" },
];

export const CHECKLISTS: ChecklistGroup[] = [
  { title: "Entity / Company — one-time per airport", scope: "entity", items: ENTITY_DOCS },
  { title: "Individual — MAN (TAEP / BAEP)", scope: "individual", items: INDIVIDUAL_DOCS },
  { title: "MATERIAL — Tools of the Trade (ToT)", scope: "material", items: MATERIAL_DOCS },
  { title: "VEHICLE — VEP + Driver ADP", scope: "vehicle", items: VEHICLE_DOCS },
];
