import { useMemo, useState } from "react";
import { Database, KeyRound, Link2, Search, Table2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Complete database schema for the AEP Portal — every table, column, datatype,
// primary key, foreign key and relationship needed to run the site. Modelled
// on the app's domain (BCAS AVSEC Order 02/2022): one Entity registers ONCE
// and raises applications across all three pillars (MAN · MATERIAL · VEHICLE).
// Target engine: PostgreSQL (normalized, 3NF, with RBAC + audit).
// ---------------------------------------------------------------------------

export type Key = "PK" | "FK" | "PK+FK";
export interface Col {
  name: string;
  type: string;
  key?: Key;
  ref?: string;      // FK target, e.g. "entities.id"
  nullable?: boolean;
  note?: string;
}
export interface Tbl {
  name: string;
  domain: string;
  purpose: string;
  cols: Col[];
}

export const SCHEMA: Tbl[] = [
  // ---- 1. Identity & Access Control -------------------------------------
  {
    name: "roles", domain: "Identity & Access", purpose: "Built-in + custom login roles (AVSEC 02/2022 §2).",
    cols: [
      { name: "role_key", type: "varchar(48)", key: "PK", note: "e.g. admin, bcas, operator" },
      { name: "label", type: "text" },
      { name: "custom", type: "boolean", note: "created in-app vs built-in" },
      { name: "assigned", type: "boolean", note: "BCAS has granted access (custom roles start false)" },
      { name: "created_at", type: "timestamptz", note: "default now()" },
    ],
  },
  {
    name: "verticals", domain: "Identity & Access", purpose: "Feature-categories the permission matrix grants over.",
    cols: [
      { name: "name", type: "varchar(32)", key: "PK", note: "Entities, Individuals, Committees, Zones, Documents, Reports, Penalties" },
      { name: "description", type: "text" },
    ],
  },
  {
    name: "role_permissions", domain: "Identity & Access", purpose: "R/W/X (CRUD) matrix — one row per role × vertical.",
    cols: [
      { name: "role_key", type: "varchar(48)", key: "PK+FK", ref: "roles.role_key" },
      { name: "vertical", type: "varchar(32)", key: "PK+FK", ref: "verticals.name" },
      { name: "can_create", type: "boolean" },
      { name: "can_read", type: "boolean" },
      { name: "can_update", type: "boolean" },
      { name: "can_delete", type: "boolean" },
    ],
  },
  {
    name: "users", domain: "Identity & Access", purpose: "Login accounts; ties a person to a role (and optionally an entity).",
    cols: [
      { name: "id", type: "uuid", key: "PK", note: "default gen_random_uuid()" },
      { name: "username", type: "varchar(64)", note: "UNIQUE" },
      { name: "password_hash", type: "text", note: "bcrypt" },
      { name: "role_key", type: "varchar(48)", key: "FK", ref: "roles.role_key" },
      { name: "entity_id", type: "varchar(16)", key: "FK", ref: "entities.id", nullable: true, note: "set for entity/individual logins" },
      { name: "display_name", type: "text" },
      { name: "mfa_enabled", type: "boolean", note: "2FA (§ identity assurance)" },
      { name: "failed_attempts", type: "integer", note: "lock after 5" },
      { name: "locked_until", type: "timestamptz", nullable: true },
      { name: "last_login", type: "timestamptz", nullable: true },
      { name: "created_at", type: "timestamptz" },
    ],
  },

  // ---- 2. Entity Registration -------------------------------------------
  {
    name: "entities", domain: "Entity Registration", purpose: "The sponsor org — registers ONCE, shared by all three pillars.",
    cols: [
      { name: "id", type: "varchar(16)", key: "PK", note: "e.g. ENT-01" },
      { name: "name", type: "text" },
      { name: "category", type: "varchar(24)", key: "FK", ref: "entity_categories.code", note: "GHA, Airline, Caterer, Cargo/CHA, MRO, Govt…" },
      { name: "status", type: "varchar(12)", note: "active | suspended | archived" },
      { name: "strength", type: "integer", note: "active individuals; >15 unlocks self-service login" },
      { name: "contract_start", type: "date" },
      { name: "contract_end", type: "date" },
      { name: "aop_linked", type: "boolean", note: "linked to Airport Operator Programme" },
      { name: "approval_stage", type: "varchar(24)", note: "registration → documentation → matrix → verification → bcas_approved" },
      { name: "created_at", type: "timestamptz" },
    ],
  },
  {
    name: "signatories", domain: "Entity Registration", purpose: "Authorised signatories per entity.",
    cols: [
      { name: "id", type: "uuid", key: "PK" },
      { name: "entity_id", type: "varchar(16)", key: "FK", ref: "entities.id" },
      { name: "name", type: "text" },
      { name: "designation", type: "text" },
      { name: "certified_by", type: "text" },
      { name: "dsc", type: "text", nullable: true, note: "digital signature cert ref" },
    ],
  },
  {
    name: "entity_docs", domain: "Entity Registration", purpose: "Registration documents & their validity.",
    cols: [
      { name: "id", type: "uuid", key: "PK" },
      { name: "entity_id", type: "varchar(16)", key: "FK", ref: "entities.id" },
      { name: "name", type: "text", note: "Security Programme, Clearance, NCASP linkage…" },
      { name: "reference", type: "text", nullable: true },
      { name: "expiry", type: "date", nullable: true },
      { name: "file_name", type: "text", nullable: true },
    ],
  },
  {
    name: "entity_job_roles", domain: "Entity Registration", purpose: "Job roles an entity declares (drive zone-need).",
    cols: [
      { name: "id", type: "uuid", key: "PK" },
      { name: "entity_id", type: "varchar(16)", key: "FK", ref: "entities.id" },
      { name: "role", type: "text" },
      { name: "justification", type: "text" },
    ],
  },
  {
    name: "contracts", domain: "Entity Registration", purpose: "Contracts that authorise passes & set functional scope.",
    cols: [
      { name: "id", type: "varchar(16)", key: "PK", note: "e.g. CON-01" },
      { name: "entity_id", type: "varchar(16)", key: "FK", ref: "entities.id" },
      { name: "counterparty", type: "text", note: "airport operator / company" },
      { name: "type", type: "varchar(24)", note: "LOI | LOA | PO | SO | Work Order" },
      { name: "start_date", type: "date" },
      { name: "end_date", type: "date" },
      { name: "copy_file_name", type: "text", nullable: true },
      { name: "scope", type: "text", note: "functional scope → allowed zones" },
      { name: "status", type: "varchar(12)", note: "active | terminated | expired" },
    ],
  },

  // ---- 3. People ---------------------------------------------------------
  {
    name: "individuals", domain: "People", purpose: "Persons sponsored by an entity (MAN pillar subjects).",
    cols: [
      { name: "id", type: "varchar(16)", key: "PK", note: "e.g. IND-014" },
      { name: "entity_id", type: "varchar(16)", key: "FK", ref: "entities.id" },
      { name: "name", type: "text" },
      { name: "job_role", type: "text" },
      { name: "has_login", type: "boolean", note: "entity may authorise a self-check login" },
      { name: "state", type: "text", nullable: true },
      { name: "district", type: "text", nullable: true },
      { name: "religion", type: "text", nullable: true },
      { name: "blood_group", type: "varchar(4)", nullable: true },
      { name: "avsec_training_expiry", type: "date", nullable: true, note: "AVSEC refresher validity — 1 yr (§13)" },
    ],
  },
  {
    name: "training_records", domain: "People", purpose: "AVSEC awareness/refresher training history (§13).",
    cols: [
      { name: "id", type: "uuid", key: "PK" },
      { name: "individual_id", type: "varchar(16)", key: "FK", ref: "individuals.id" },
      { name: "type", type: "varchar(24)", note: "awareness | refresher" },
      { name: "issued_on", type: "date" },
      { name: "expiry_date", type: "date" },
      { name: "status", type: "varchar(12)", note: "valid | lapsed" },
    ],
  },

  // ---- 4. Applications & Passes -----------------------------------------
  {
    name: "pillars", domain: "Applications & Passes", purpose: "Lookup — the three permit pillars.",
    cols: [
      { name: "key", type: "varchar(10)", key: "PK", note: "MAN | MATERIAL | VEHICLE" },
      { name: "roman", type: "varchar(4)" },
      { name: "label", type: "text" },
      { name: "pass_code", type: "varchar(8)", note: "AEP | ToT | VAP" },
      { name: "clause", type: "text" },
    ],
  },
  {
    name: "pass_types", domain: "Applications & Passes", purpose: "Lookup — pass variants per pillar + validity rule.",
    cols: [
      { name: "code", type: "varchar(12)", key: "PK", note: "BAEP, TAEP, VAT, Permanent, ToT, VAP, ADP" },
      { name: "pillar_key", type: "varchar(10)", key: "FK", ref: "pillars.key" },
      { name: "label", type: "text" },
      { name: "validity_rule", type: "text", note: "drives valid_to computation" },
    ],
  },
  {
    name: "applications", domain: "Applications & Passes", purpose: "A pass request; the shared entity is always the sponsor.",
    cols: [
      { name: "id", type: "varchar(16)", key: "PK", note: "e.g. APP-2216" },
      { name: "pillar_key", type: "varchar(10)", key: "FK", ref: "pillars.key" },
      { name: "entity_id", type: "varchar(16)", key: "FK", ref: "entities.id" },
      { name: "contract_id", type: "varchar(16)", key: "FK", ref: "contracts.id", nullable: true },
      { name: "committee_id", type: "varchar(16)", key: "FK", ref: "committees.id", nullable: true },
      { name: "pass_type", type: "varchar(12)", key: "FK", ref: "pass_types.code" },
      { name: "subject", type: "text", note: "person (MAN) / item (MATERIAL) / vehicle (VEHICLE)" },
      { name: "job_role", type: "text", nullable: true },
      { name: "escort", type: "text", nullable: true, note: "named AEP holder (§8.3.4.12 · §12B)" },
      { name: "status", type: "varchar(24)", note: "draft … issued … withdrawn (11-state lifecycle)" },
      { name: "created_by", type: "uuid", key: "FK", ref: "users.id" },
      { name: "created_at", type: "date" },
      { name: "created_at_ts", type: "timestamptz", note: "SLA clock start" },
      { name: "valid_from", type: "date", nullable: true },
      { name: "valid_to", type: "date", nullable: true },
      { name: "expiry_date", type: "date", nullable: true },
      { name: "clause_ref", type: "text" },
    ],
  },
  {
    name: "application_zones", domain: "Applications & Passes", purpose: "Junction — zones requested on an application.",
    cols: [
      { name: "application_id", type: "varchar(16)", key: "PK+FK", ref: "applications.id" },
      { name: "zone_code", type: "varchar(6)", key: "PK+FK", ref: "zones.code" },
    ],
  },
  {
    name: "step_logs", domain: "Applications & Passes", purpose: "Timestamped trail of every lifecycle step + SLA notes.",
    cols: [
      { name: "id", type: "uuid", key: "PK" },
      { name: "application_id", type: "varchar(16)", key: "FK", ref: "applications.id" },
      { name: "stage", type: "text" },
      { name: "at", type: "timestamptz" },
      { name: "by_user", type: "uuid", key: "FK", ref: "users.id", nullable: true },
      { name: "action", type: "text", nullable: true, note: "transition label" },
      { name: "sla_note", type: "text", nullable: true, note: "mandatory when SLA breached" },
      { name: "note", type: "text", nullable: true },
    ],
  },

  // ---- 5. Committees -----------------------------------------------------
  {
    name: "committees", domain: "Committees", purpose: "Scheduled committee sessions that clear applications.",
    cols: [
      { name: "id", type: "varchar(16)", key: "PK", note: "e.g. CMTE-07" },
      { name: "name", type: "text" },
      { name: "scheduled_date", type: "date" },
      { name: "chair", type: "text" },
      { name: "status", type: "varchar(16)", note: "scheduled | held | closed" },
    ],
  },
  {
    name: "committee_stages", domain: "Committees", purpose: "Lookup — the 8-step processing chain.",
    cols: [
      { name: "stage_no", type: "smallint", key: "PK", note: "1..8" },
      { name: "title", type: "text" },
      { name: "owner", type: "text", note: "responsible role" },
      { name: "clause", type: "text" },
      { name: "description", type: "text" },
    ],
  },
  {
    name: "committee_reviews", domain: "Committees", purpose: "Per-application decision at each committee stage.",
    cols: [
      { name: "id", type: "uuid", key: "PK" },
      { name: "committee_id", type: "varchar(16)", key: "FK", ref: "committees.id" },
      { name: "application_id", type: "varchar(16)", key: "FK", ref: "applications.id" },
      { name: "stage_no", type: "smallint", key: "FK", ref: "committee_stages.stage_no" },
      { name: "decision", type: "varchar(16)", note: "approved | rejected | clarification" },
      { name: "remarks", type: "text", nullable: true },
      { name: "decided_at", type: "timestamptz" },
    ],
  },

  // ---- 6. Zones & Access -------------------------------------------------
  {
    name: "zones", domain: "Zones & Access", purpose: "Lookup — airport zones; SRA = Security Restricted Area.",
    cols: [
      { name: "code", type: "varchar(6)", key: "PK", note: "A, D, T, P, Sd, Cd, Csd…" },
      { name: "label", type: "text" },
      { name: "sra", type: "boolean" },
    ],
  },
  {
    name: "entity_zones", domain: "Zones & Access", purpose: "Junction — zones an entity is entitled to.",
    cols: [
      { name: "entity_id", type: "varchar(16)", key: "PK+FK", ref: "entities.id" },
      { name: "zone_code", type: "varchar(6)", key: "PK+FK", ref: "zones.code" },
      { name: "granted_on", type: "date" },
    ],
  },
  {
    name: "individual_zones", domain: "Zones & Access", purpose: "Junction — effective zones granted to an individual.",
    cols: [
      { name: "individual_id", type: "varchar(16)", key: "PK+FK", ref: "individuals.id" },
      { name: "zone_code", type: "varchar(6)", key: "PK+FK", ref: "zones.code" },
    ],
  },
  {
    name: "zone_escalations", domain: "Zones & Access", purpose: "Requests exceeding entitled zones (need-to-access).",
    cols: [
      { name: "id", type: "varchar(16)", key: "PK", note: "e.g. ESC-01" },
      { name: "entity_id", type: "varchar(16)", key: "FK", ref: "entities.id" },
      { name: "application_id", type: "varchar(16)", key: "FK", ref: "applications.id", nullable: true },
      { name: "subject", type: "text" },
      { name: "requested", type: "text[]", note: "requested zone codes" },
      { name: "exceeded", type: "text[]", note: "codes beyond entitlement" },
      { name: "justification", type: "text" },
      { name: "status", type: "varchar(12)", note: "blocked | approved | rejected" },
      { name: "since", type: "timestamptz" },
    ],
  },

  // ---- 7. Compliance & Enforcement --------------------------------------
  {
    name: "stop_list", domain: "Compliance & Enforcement", purpose: "Bar list screened before EVERY issuance (§9).",
    cols: [
      { name: "id", type: "uuid", key: "PK" },
      { name: "name", type: "text", note: "indexed for screening" },
      { name: "reason", type: "text" },
      { name: "source", type: "text", note: "BCAS RO | Airport Operator | LEA" },
      { name: "since", type: "date" },
    ],
  },
  {
    name: "surrenders", domain: "Compliance & Enforcement", purpose: "Pass surrender / late-return tracking.",
    cols: [
      { name: "id", type: "varchar(16)", key: "PK", note: "e.g. SUR-11" },
      { name: "application_id", type: "varchar(16)", key: "FK", ref: "applications.id" },
      { name: "entity_id", type: "varchar(16)", key: "FK", ref: "entities.id" },
      { name: "holder", type: "text" },
      { name: "reason", type: "varchar(16)", note: "terminated | expired | deceased | surrendered | withdrawn" },
      { name: "exit_date", type: "date" },
      { name: "due_date", type: "date" },
      { name: "days_late", type: "integer" },
      { name: "entity_justification", type: "text", nullable: true },
      { name: "penalty", type: "text", nullable: true },
      { name: "penalty_status", type: "varchar(10)", nullable: true, note: "open | resolved" },
    ],
  },
  {
    name: "penalties", domain: "Compliance & Enforcement", purpose: "BCAS penalties with written justification (§10.8).",
    cols: [
      { name: "id", type: "uuid", key: "PK" },
      { name: "entity_id", type: "varchar(16)", key: "FK", ref: "entities.id" },
      { name: "application_id", type: "varchar(16)", key: "FK", ref: "applications.id", nullable: true },
      { name: "surrender_id", type: "varchar(16)", key: "FK", ref: "surrenders.id", nullable: true },
      { name: "description", type: "text" },
      { name: "clause", type: "text" },
      { name: "amount", type: "numeric(12,2)", nullable: true },
      { name: "status", type: "varchar(10)", note: "open | resolved" },
      { name: "raised_by", type: "uuid", key: "FK", ref: "users.id" },
      { name: "raised_at", type: "timestamptz" },
    ],
  },

  // ---- 8. System & Reference --------------------------------------------
  {
    name: "notifications", domain: "System & Reference", purpose: "Audience-scoped alerts with source + timestamp.",
    cols: [
      { name: "id", type: "uuid", key: "PK" },
      { name: "ts", type: "timestamptz" },
      { name: "to_audience", type: "varchar(16)", note: "entity | bcas | operator | individual | broadcast" },
      { name: "entity_id", type: "varchar(16)", key: "FK", ref: "entities.id", nullable: true, note: "scopes to one entity when set" },
      { name: "source", type: "varchar(16)", note: "BCAS | Pass Section | Admin | Entity | System" },
      { name: "type", type: "text" },
      { name: "message", type: "text" },
      { name: "tone", type: "varchar(4)", note: "ok | warn | bad" },
      { name: "read", type: "boolean" },
    ],
  },
  {
    name: "audit_log", domain: "System & Reference", purpose: "Immutable action trail across the portal.",
    cols: [
      { name: "id", type: "uuid", key: "PK" },
      { name: "ts", type: "timestamptz" },
      { name: "actor", type: "text" },
      { name: "role_key", type: "varchar(48)", key: "FK", ref: "roles.role_key" },
      { name: "action", type: "text" },
      { name: "object", type: "text" },
      { name: "detail", type: "text" },
      { name: "tone", type: "varchar(4)", note: "ok | warn | bad" },
    ],
  },
  {
    name: "guideline_clauses", domain: "System & Reference", purpose: "Reference — AVSEC 02/2022 clauses cited across the app.",
    cols: [
      { name: "id", type: "uuid", key: "PK" },
      { name: "order_no", type: "varchar(16)" },
      { name: "clause", type: "text" },
      { name: "sub_clause", type: "text", nullable: true },
      { name: "description", type: "text" },
    ],
  },

  // =========================================================================
  // PHASE 2 — operational tables a production system needs beyond the core
  // domain model (issued cards, pillar subjects, BGC, files, gate logs,
  // sessions, per-user reads, configurable SLA). Grouped into existing
  // domains so they slot under the same headings.
  // =========================================================================

  // ---- Identity & Access (security/sessions) ----------------------------
  {
    name: "user_sessions", domain: "Identity & Access", purpose: "Active login sessions / tokens (audit-logged, revocable).",
    cols: [
      { name: "id", type: "uuid", key: "PK" },
      { name: "user_id", type: "uuid", key: "FK", ref: "users.id" },
      { name: "token_hash", type: "text", note: "hashed JWT/refresh token" },
      { name: "ip", type: "inet" },
      { name: "user_agent", type: "text" },
      { name: "created_at", type: "timestamptz" },
      { name: "expires_at", type: "timestamptz" },
      { name: "revoked_at", type: "timestamptz", nullable: true },
    ],
  },
  {
    name: "auth_events", domain: "Identity & Access", purpose: "Durable login-attempt log — powers throttle + lockout (§ identity assurance).",
    cols: [
      { name: "id", type: "uuid", key: "PK" },
      { name: "username", type: "varchar(64)", note: "indexed for throttle window" },
      { name: "user_id", type: "uuid", key: "FK", ref: "users.id", nullable: true },
      { name: "ip", type: "inet" },
      { name: "success", type: "boolean" },
      { name: "reason", type: "varchar(24)", nullable: true, note: "bad_password | locked | ok" },
      { name: "at", type: "timestamptz" },
    ],
  },

  // ---- Entity Registration ----------------------------------------------
  {
    name: "entity_categories", domain: "Entity Registration", purpose: "Lookup — normalizes entity category + regulatory basis.",
    cols: [
      { name: "code", type: "varchar(24)", key: "PK", note: "GHA, Airline, Caterer, Cargo/CHA, MRO, Govt…" },
      { name: "label", type: "text" },
      { name: "operator_devised", type: "boolean", note: "true where AVSEC 02/2022 is silent (e.g. MATERIAL/ToT lifecycle)" },
    ],
  },

  // ---- People ------------------------------------------------------------
  {
    name: "bgc_checks", domain: "People", purpose: "Background / antecedent verification — gates issuance (§9 · §11).",
    cols: [
      { name: "id", type: "uuid", key: "PK" },
      { name: "individual_id", type: "varchar(16)", key: "FK", ref: "individuals.id" },
      { name: "type", type: "varchar(24)", note: "police | antecedent | court" },
      { name: "authority", type: "text", note: "issuing LEA / district" },
      { name: "status", type: "varchar(12)", note: "pending | clear | adverse" },
      { name: "verified_on", type: "date", nullable: true },
      { name: "valid_until", type: "date", nullable: true, note: "BGC older than 3 months → clarification" },
      { name: "remarks", type: "text", nullable: true },
    ],
  },

  // ---- Applications & Passes --------------------------------------------
  {
    name: "passes", domain: "Applications & Passes", purpose: "The issued card after approval — the physical AEP/ToT/VAP.",
    cols: [
      { name: "id", type: "varchar(16)", key: "PK", note: "e.g. AEP-0912" },
      { name: "application_id", type: "varchar(16)", key: "FK", ref: "applications.id", note: "UNIQUE — one card per app" },
      { name: "pass_no", type: "text", note: "printed serial" },
      { name: "qr_code", type: "text", note: "signed payload for gate scan" },
      { name: "chip_uid", type: "text", nullable: true, note: "smart-card UID" },
      { name: "printed_by", type: "uuid", key: "FK", ref: "users.id" },
      { name: "printed_at", type: "timestamptz" },
      { name: "status", type: "varchar(16)", note: "issued | parked | deactivated | revoked | surrendered" },
      { name: "revoked_reason", type: "text", nullable: true },
    ],
  },
  {
    name: "vehicles", domain: "Applications & Passes", purpose: "VEHICLE-pillar subject detail for a VAP (§12A).",
    cols: [
      { name: "id", type: "uuid", key: "PK" },
      { name: "application_id", type: "varchar(16)", key: "FK", ref: "applications.id" },
      { name: "reg_no", type: "varchar(16)", note: "indexed" },
      { name: "make_model", type: "text" },
      { name: "chassis_no", type: "text" },
      { name: "engine_no", type: "text" },
      { name: "rc_valid_until", type: "date", nullable: true },
      { name: "insurance_valid_until", type: "date", nullable: true },
      { name: "puc_valid_until", type: "date", nullable: true },
      { name: "fitness_valid_until", type: "date", nullable: true },
    ],
  },
  {
    name: "materials", domain: "Applications & Passes", purpose: "MATERIAL-pillar subject detail for a ToT (§12B).",
    cols: [
      { name: "id", type: "uuid", key: "PK" },
      { name: "application_id", type: "varchar(16)", key: "FK", ref: "applications.id" },
      { name: "item", type: "text" },
      { name: "serial_no", type: "text", nullable: true },
      { name: "quantity", type: "integer" },
      { name: "description", type: "text", nullable: true },
    ],
  },
  {
    name: "attachments", domain: "Applications & Passes", purpose: "Polymorphic file store (photos, ID proof, BGC report, contract copy).",
    cols: [
      { name: "id", type: "uuid", key: "PK" },
      { name: "owner_type", type: "varchar(24)", note: "entity | application | individual | contract | bgc" },
      { name: "owner_id", type: "varchar(24)", note: "polymorphic ref (validated in app)" },
      { name: "kind", type: "varchar(24)", note: "photo | id_proof | bgc_report | medical | contract_copy" },
      { name: "file_name", type: "text" },
      { name: "mime", type: "varchar(64)" },
      { name: "size_bytes", type: "bigint" },
      { name: "checksum", type: "text", note: "sha256 — dedupe + integrity" },
      { name: "uploaded_by", type: "uuid", key: "FK", ref: "users.id" },
      { name: "uploaded_at", type: "timestamptz" },
    ],
  },

  // ---- Committees --------------------------------------------------------
  {
    name: "committee_members", domain: "Committees", purpose: "Who sits on a committee (chair / member / quorum).",
    cols: [
      { name: "id", type: "uuid", key: "PK" },
      { name: "committee_id", type: "varchar(16)", key: "FK", ref: "committees.id" },
      { name: "user_id", type: "uuid", key: "FK", ref: "users.id", nullable: true },
      { name: "member_name", type: "text", note: "for external members without a login" },
      { name: "designation", type: "text" },
      { name: "seat", type: "varchar(12)", note: "chair | member | secretary" },
      { name: "quorum_required", type: "boolean" },
    ],
  },

  // ---- Zones & Access (gate verification) -------------------------------
  {
    name: "gates", domain: "Zones & Access", purpose: "Physical access points where passes are scanned.",
    cols: [
      { name: "code", type: "varchar(8)", key: "PK", note: "e.g. G1, CARGO-1" },
      { name: "name", type: "text" },
      { name: "type", type: "varchar(16)", note: "passenger | cargo | staff | vehicle" },
      { name: "zone_code", type: "varchar(6)", key: "FK", ref: "zones.code" },
    ],
  },
  {
    name: "access_events", domain: "Zones & Access", purpose: "Every gate scan (CISF) — match / mismatch / stop-list hit.",
    cols: [
      { name: "id", type: "uuid", key: "PK" },
      { name: "pass_id", type: "varchar(16)", key: "FK", ref: "passes.id", nullable: true },
      { name: "gate_code", type: "varchar(8)", key: "FK", ref: "gates.code" },
      { name: "verified_by", type: "uuid", key: "FK", ref: "users.id", note: "CISF gate officer" },
      { name: "scanned_at", type: "timestamptz" },
      { name: "result", type: "varchar(16)", note: "match | mismatch | expired | stoplist_hit | revoked" },
      { name: "note", type: "text", nullable: true },
    ],
  },

  // ---- System & Reference -----------------------------------------------
  {
    name: "notification_reads", domain: "System & Reference", purpose: "Per-user read state for broadcast notifications.",
    cols: [
      { name: "notification_id", type: "uuid", key: "PK+FK", ref: "notifications.id" },
      { name: "user_id", type: "uuid", key: "PK+FK", ref: "users.id" },
      { name: "read_at", type: "timestamptz" },
    ],
  },
  {
    name: "sla_policies", domain: "System & Reference", purpose: "Configurable SLA per stage/pillar + escalation target.",
    cols: [
      { name: "id", type: "uuid", key: "PK" },
      { name: "pillar_key", type: "varchar(10)", key: "FK", ref: "pillars.key", nullable: true, note: "null = all pillars" },
      { name: "stage", type: "text" },
      { name: "working_days", type: "integer", note: "SLA clock in WD" },
      { name: "escalate_to", type: "varchar(48)", key: "FK", ref: "roles.role_key", nullable: true },
      { name: "clause", type: "text" },
    ],
  },
];

const DOMAINS = Array.from(new Set(SCHEMA.map((t) => t.domain)));

function KeyBadge({ k }: { k?: Key }) {
  if (!k) return null;
  const isPk = k.includes("PK");
  const isFk = k.includes("FK");
  return (
    <span className={`db-key ${isPk ? "is-pk" : ""} ${isFk ? "is-fk" : ""}`}>
      {isPk && <KeyRound size={11} />}
      {isFk && <Link2 size={11} />}
      {k}
    </span>
  );
}

export default function DatabasePage() {
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState<string | "all">("all");

  const fkCount = useMemo(
    () => SCHEMA.reduce((n, t) => n + t.cols.filter((c) => c.key?.includes("FK")).length, 0),
    [],
  );
  const colCount = useMemo(() => SCHEMA.reduce((n, t) => n + t.cols.length, 0), []);

  const tables = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return SCHEMA.filter((t) => {
      if (domain !== "all" && t.domain !== domain) return false;
      if (!needle) return true;
      return (
        t.name.toLowerCase().includes(needle) ||
        t.purpose.toLowerCase().includes(needle) ||
        t.cols.some((c) => c.name.toLowerCase().includes(needle) || (c.ref ?? "").toLowerCase().includes(needle))
      );
    });
  }, [q, domain]);

  const grouped = useMemo(() => {
    const map = new Map<string, Tbl[]>();
    for (const t of tables) {
      if (!map.has(t.domain)) map.set(t.domain, []);
      map.get(t.domain)!.push(t);
    }
    return map;
  }, [tables]);

  return (
    <div className="db-page">
      <header className="db-head">
        <div className="db-title">
          <span className="db-mark"><Database size={20} /></span>
          <div>
            <h1>Database schema</h1>
            <p className="muted">Complete relational model for the AEP Portal — PostgreSQL · normalized (3NF) · RBAC + audit. Primary keys, foreign keys, datatypes and relationships for every table the website needs.</p>
          </div>
        </div>
        <div className="db-stats">
          <div className="db-stat"><b>{SCHEMA.length}</b><span>tables</span></div>
          <div className="db-stat"><b>{colCount}</b><span>columns</span></div>
          <div className="db-stat"><b>{fkCount}</b><span>foreign keys</span></div>
          <div className="db-stat"><b>{DOMAINS.length}</b><span>domains</span></div>
        </div>
      </header>

      <div className="db-controls">
        <label className="db-search">
          <Search size={15} />
          <input placeholder="Search tables, columns or references…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="db-chips">
          <button className={`chip ${domain === "all" ? "on" : ""}`} onClick={() => setDomain("all")}>All</button>
          {DOMAINS.map((d) => (
            <button key={d} className={`chip ${domain === d ? "on" : ""}`} onClick={() => setDomain(d)}>{d}</button>
          ))}
        </div>
      </div>

      <div className="db-legend">
        <span className="db-key is-pk"><KeyRound size={11} />PK</span> primary key
        <span className="db-key is-fk"><Link2 size={11} />FK</span> foreign key → referenced table
        <span className="db-dim">italic type</span> = nullable column
      </div>

      {tables.length === 0 && <p className="muted db-empty">No tables match “{q}”.</p>}

      {DOMAINS.filter((d) => grouped.has(d)).map((d) => (
        <section key={d} className="db-domain">
          <h2 className="db-domain-h">{d} <span className="muted">· {grouped.get(d)!.length}</span></h2>
          <div className="db-grid">
            {grouped.get(d)!.map((t) => (
              <article key={t.name} className="db-table card">
                <header className="db-table-h">
                  <Table2 size={14} />
                  <code>{t.name}</code>
                </header>
                <p className="db-purpose">{t.purpose}</p>
                <div className="db-cols">
                  <table>
                    <tbody>
                      {t.cols.map((c) => (
                        <tr key={c.name} className={c.key?.includes("PK") ? "is-pkrow" : ""}>
                          <td className="db-c-name"><code>{c.name}</code></td>
                          <td className={`db-c-type ${c.nullable ? "nullable" : ""}`}><code>{c.type}</code></td>
                          <td className="db-c-key"><KeyBadge k={c.key} /></td>
                          <td className="db-c-ref">
                            {c.ref && <span className="db-fkref"><Link2 size={10} />{c.ref}</span>}
                            {c.note && <span className="db-note">{c.note}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      <p className="db-foot mono">
        Conventions: surrogate <code>uuid</code> keys use <code>gen_random_uuid()</code>; human-facing rows keep readable IDs (ENT-·, APP-·, CON-·).
        All FKs <code>ON DELETE RESTRICT</code> except junctions (<code>CASCADE</code>). Row-Level Security scopes entity/individual logins to their own <code>entity_id</code>.
      </p>
    </div>
  );
}
