import { useMemo, useState } from "react";
import { Database, KeyRound, Link2, Search, Table2, Share2, ArrowRight, Copy, Check } from "lucide-react";

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

const DOMAIN_ACCENT: Record<string, string> = {
  "Identity & Access": "#7c3aed",
  "Entity Registration": "#1a56db",
  "People": "#0891b2",
  "Applications & Passes": "#15803d",
  "Committees": "#b45309",
  "Zones & Access": "#0d9488",
  "Compliance & Enforcement": "#dc2626",
  "System & Reference": "#64748b",
};

// What each table holds + the correlations (joins) you can extract from it.
const INSIGHT: Record<string, string> = {
  roles: "Login roles. Join to users (who holds each role) and role_permissions (what each may do).",
  verticals: "Feature-categories. Join to role_permissions to build the full R/W/X access matrix.",
  role_permissions: "The access matrix. roles × verticals answers “which roles can delete Penalties?”.",
  users: "Accounts. Correlate to roles (privilege), entities (which org a login belongs to), and everything they created (created_by / uploaded_by / raised_by).",
  entities: "The hub. One entity → many contracts, individuals, applications, zone entitlements, surrenders, penalties — join to see an org’s whole compliance footprint.",
  signatories: "Authorised signatories per entity. Join to entities to verify who may sign.",
  entity_docs: "Docs + expiry. Join to entities to flag an expiring Security Programme / Clearance.",
  entity_job_roles: "Declared roles → zone-need. Correlate with zone entitlements.",
  contracts: "Authorise passes + scope. contracts → applications checks every pass sits under a live contract.",
  individuals: "People. Correlate to entities (sponsor), applications (their passes), bgc_checks (vetting), training_records (AVSEC validity), individual_zones (access).",
  training_records: "AVSEC training. Join to individuals to auto-deactivate lapsed holders (§13).",
  pillars: "The 3 permit types. Split MAN / MATERIAL / VEHICLE volumes via applications & pass_types.",
  pass_types: "Pass variants per pillar. Join to applications for validity rules.",
  applications: "The workflow core. Correlate to entities (sponsor), contracts, pillars, pass_types, committees, passes (issued card), step_logs (SLA trail), application_zones (access requested).",
  application_zones: "Zones requested per pass. applications × zones reveals SRA exposure.",
  step_logs: "Timestamped lifecycle trail. Join applications + users to measure SLA breaches per stage / officer.",
  committees: "Sittings. Join to committee_reviews (decisions) and committee_members (quorum).",
  committee_stages: "The 8-step chain. Join to committee_reviews to track where an application sits.",
  committee_reviews: "Decisions. committees × applications × stages gives approval throughput.",
  zones: "Airport zones (SRA flag). Join to application_zones / entity_zones / individual_zones / gates for who can go where.",
  entity_zones: "Org entitlements. Compare with application_zones to detect requests beyond entitlement → escalations.",
  individual_zones: "Effective per-person access. Join to access_events to validate gate scans.",
  zone_escalations: "Need-to-access beyond entitlement. Join to entities / applications for the approval trail.",
  stop_list: "Bar list. Screen by name against individuals / applications before issuance (§9).",
  surrenders: "Return tracking. Join to applications / entities to compute late-return days + penalties.",
  penalties: "Enforcement. Correlate to entities / applications / surrenders / users (raised_by) for accountability.",
  notifications: "Alerts. Join to entities (scoped) and notification_reads (per-user read state).",
  audit_log: "Immutable trail. Join to roles and object IDs to reconstruct any action history.",
  guideline_clauses: "Reference clauses. Cite via applications.clause_ref for the governing rule.",
  user_sessions: "Active sessions. Join to users for concurrent-login + revocation.",
  auth_events: "Login attempts. Join to users / username for throttle, lockout, brute-force detection.",
  entity_categories: "Category lookup + basis. Join to entities to split regulatory-mandatory vs operator-devised.",
  bgc_checks: "Vetting. Join to individuals to block issuance on adverse / expired BGC (§9 · §11).",
  passes: "Issued cards. Correlate to applications (1:1) and access_events (gate scans) for a card’s live status.",
  vehicles: "VAP subject detail. Join to applications to validate RC / insurance / PUC / fitness before issue.",
  materials: "ToT subject detail. Join to applications for item / serial / qty.",
  attachments: "Polymorphic files. Correlate by owner_type + owner_id to any entity / application / individual / bgc.",
  committee_members: "Roster. Join to committees / users for quorum + conflict checks.",
  gates: "Access points. Join to zones and access_events for gate-level traffic.",
  access_events: "Every scan. Correlate to passes / gates / users (CISF) for real-time access analytics + stop-list hits.",
  notification_reads: "Read receipts. notifications × users gives delivery / read metrics.",
  sla_policies: "SLA config. Join to step_logs to flag breaches per stage / pillar.",
};

interface Edge { from: string; col: string; to: string; refCol: string; }
const EDGES: Edge[] = [];
const OUT: Record<string, Edge[]> = {};
const IN: Record<string, Edge[]> = {};
for (const t of SCHEMA)
  for (const c of t.cols)
    if (c.ref) {
      const [to, refCol] = c.ref.split(".");
      const e: Edge = { from: t.name, col: c.name, to, refCol };
      EDGES.push(e);
      (OUT[t.name] ??= []).push(e);
      (IN[to] ??= []).push(e);
    }

const TABLE_DOMAIN: Record<string, string> = Object.fromEntries(SCHEMA.map((t) => [t.name, t.domain]));

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

function TableChip({ name, onClick }: { name: string; onClick?: () => void }) {
  const style = { ["--a" as string]: DOMAIN_ACCENT[TABLE_DOMAIN[name]] ?? "#64748b" };
  return onClick
    ? <button type="button" className="db-relchip is-btn" style={style} onClick={onClick}><code>{name}</code></button>
    : <span className="db-relchip" style={style}><code>{name}</code></span>;
}

/** A runnable JOIN for a foreign-key edge — child.col = parent.refCol. */
function joinSql(e: Edge): string {
  return `SELECT *\nFROM ${e.from}\nJOIN ${e.to} ON ${e.to}.${e.refCol} = ${e.from}.${e.col}\nLIMIT 50;`;
}

function CopyBtn({ text, label = "Copy JOIN" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async (ev: React.MouseEvent) => {
    ev.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
    }
    setDone(true); setTimeout(() => setDone(false), 1400);
  };
  return (
    <button type="button" className={`db-copy ${done ? "is-done" : ""}`} onClick={copy} title={text}>
      {done ? <Check size={11} /> : <Copy size={11} />}{done ? "Copied" : label}
    </button>
  );
}

/** Focused ER diagram: `focus` in the centre, tables that reference it on the
 *  left (children → focus), tables it references on the right (focus → parents).
 *  Every connector is labelled with the FK column; boxes are clickable. */
function ErDiagram({ focus, setFocus }: { focus: string; setFocus: (t: string) => void }) {
  const parents = OUT[focus] ?? [];   // focus references these (focus is child)
  const children = IN[focus] ?? [];   // these reference focus (focus is parent)
  const W = 760;
  const boxW = 150, boxH = 30, cBoxW = 176, cBoxH = 40, rowH = 46, padY = 24;
  const rows = Math.max(parents.length, children.length, 1);
  const H = rows * rowH + padY * 2;
  const midY = H / 2;
  const leftX = 16, rightX = W - 16 - boxW;
  const cX = (W - cBoxW) / 2, cY = midY - cBoxH / 2;
  const accent = DOMAIN_ACCENT[TABLE_DOMAIN[focus]] ?? "#1a56db";
  const colY = (i: number, n: number) => padY + (rows - n) * rowH / 2 + i * rowH + boxH / 2;

  const box = (name: string, x: number, y: number, w: number, h: number, center = false) => {
    const a = DOMAIN_ACCENT[TABLE_DOMAIN[name]] ?? "#64748b";
    return (
      <g key={`${center ? "c" : ""}${name}-${x}-${y}`} className="er-box" onClick={() => setFocus(name)} style={{ cursor: "pointer" }}>
        <rect x={x} y={y} width={w} height={h} rx={8} fill={center ? a : "var(--surface-card,#fff)"}
          stroke={a} strokeWidth={center ? 0 : 1.4} />
        <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle"
          fontFamily="var(--mono,monospace)" fontSize={center ? 13 : 11.5} fontWeight={center ? 700 : 600}
          fill={center ? "#fff" : a}>{name}</text>
      </g>
    );
  };

  const connector = (x1: number, y1: number, x2: number, y2: number, label: string, color: string, key: string) => {
    const mx = (x1 + x2) / 2;
    return (
      <g key={key}>
        <path d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`} fill="none" stroke={color} strokeWidth={1.3} opacity={0.55} markerEnd="url(#er-arrow)" />
        <text x={mx} y={(y1 + y2) / 2 - 3} textAnchor="middle" fontFamily="var(--mono,monospace)" fontSize={9.5} fill="var(--text-muted,#64748b)">{label}</text>
      </g>
    );
  };

  return (
    <div className="er-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="er-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Entity-relationship diagram centred on ${focus}`}>
        <defs>
          <marker id="er-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--text-muted,#94a3b8)" />
          </marker>
        </defs>
        {/* children on the left: child → focus */}
        {children.map((e, i) => {
          const y = colY(i, children.length);
          const color = DOMAIN_ACCENT[TABLE_DOMAIN[e.from]] ?? "#64748b";
          return (
            <g key={`ch-${e.from}-${e.col}`}>
              {connector(leftX + boxW, y, cX, cY + cBoxH / 2, e.col, color, `chl-${e.from}-${e.col}`)}
              {box(e.from, leftX, y - boxH / 2, boxW, boxH)}
            </g>
          );
        })}
        {/* parents on the right: focus → parent */}
        {parents.map((e, i) => {
          const y = colY(i, parents.length);
          return (
            <g key={`pa-${e.to}-${e.col}`}>
              {connector(cX + cBoxW, cY + cBoxH / 2, rightX, y, e.col, accent, `pal-${e.to}-${e.col}`)}
              {box(e.to, rightX, y - boxH / 2, boxW, boxH)}
            </g>
          );
        })}
        {box(focus, cX, cY, cBoxW, cBoxH, true)}
      </svg>
      <div className="er-caption muted">
        <span><span className="db-reldot in" /> left → centre: tables that <b>reference</b> {focus}</span>
        <span><span className="db-reldot out" /> centre → right: tables {focus} <b>references</b></span>
        <span>· click any box to re-centre</span>
      </div>
    </div>
  );
}

export default function DatabasePage() {
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState<string | "all">("all");
  const [view, setView] = useState<"tables" | "relationships">("tables");
  const [focus, setFocus] = useState("entities");

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

  // Hub ranking — most-referenced tables (by incoming FKs).
  const hubs = useMemo(
    () => Object.entries(IN).map(([t, es]) => ({ t, n: es.length })).sort((a, b) => b.n - a.n).slice(0, 8),
    [],
  );
  const maxHub = hubs[0]?.n ?? 1;

  return (
    <div className="db-page">
      <header className="db-head">
        <div className="db-title">
          <span className="db-mark"><Database size={20} /></span>
          <div>
            <h1>Database schema</h1>
            <p className="muted">Complete relational model for the AEP Portal — PostgreSQL · normalized (3NF) · RBAC + audit. Every table, column, datatype, primary/foreign key and relationship the site needs.</p>
          </div>
        </div>
        <div className="db-stats">
          <div className="db-stat"><b>{SCHEMA.length}</b><span>tables</span></div>
          <div className="db-stat"><b>{colCount}</b><span>columns</span></div>
          <div className="db-stat"><b>{EDGES.length}</b><span>relationships</span></div>
          <div className="db-stat"><b>{DOMAINS.length}</b><span>domains</span></div>
        </div>
      </header>

      <div className="db-viewtabs">
        <button className={`db-vtab ${view === "tables" ? "on" : ""}`} onClick={() => setView("tables")}><Table2 size={14} /> Tables</button>
        <button className={`db-vtab ${view === "relationships" ? "on" : ""}`} onClick={() => setView("relationships")}><Share2 size={14} /> Relationships</button>
      </div>

      {view === "tables" && (
        <>
          <div className="db-controls">
            <label className="db-search">
              <Search size={15} />
              <input placeholder="Search tables, columns or references…" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <div className="db-chips">
              <button className={`chip ${domain === "all" ? "on" : ""}`} onClick={() => setDomain("all")}>All</button>
              {DOMAINS.map((d) => (
                <button key={d} className={`chip ${domain === d ? "on" : ""}`} style={domain === d ? { background: DOMAIN_ACCENT[d], borderColor: DOMAIN_ACCENT[d] } : undefined} onClick={() => setDomain(d)}>{d}</button>
              ))}
            </div>
          </div>

          <div className="db-legend">
            <span className="db-key is-pk"><KeyRound size={11} />PK</span> primary key
            <span className="db-key is-fk"><Link2 size={11} />FK</span> foreign key
            <span className="db-reldot out" /> references
            <span className="db-reldot in" /> referenced by
            <span className="db-dim">italic type</span> = nullable
          </div>

          {tables.length === 0 && <p className="muted db-empty">No tables match “{q}”.</p>}

          {DOMAINS.filter((d) => grouped.has(d)).map((d) => (
            <section key={d} className="db-domain">
              <h2 className="db-domain-h"><span className="db-domain-dot" style={{ background: DOMAIN_ACCENT[d] }} />{d} <span className="muted">· {grouped.get(d)!.length}</span></h2>
              <div className="db-grid">
                {grouped.get(d)!.map((t) => {
                  const out = OUT[t.name] ?? [];
                  const inc = IN[t.name] ?? [];
                  const incTables = Array.from(new Set(inc.map((e) => e.from)));
                  return (
                    <article key={t.name} className="db-table card" style={{ ["--accent" as string]: DOMAIN_ACCENT[d] }}>
                      <header className="db-table-h">
                        <Table2 size={14} />
                        <code>{t.name}</code>
                        <span className="db-table-meta">{t.cols.length} cols · {out.length + inc.length} links</span>
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
                      {(out.length > 0 || incTables.length > 0) && (
                        <div className="db-rel">
                          {out.length > 0 && (
                            <div className="db-rel-row">
                              <span className="db-rel-l"><span className="db-reldot out" />references</span>
                              <span className="db-rel-chips">{out.map((e) => <TableChip key={e.col + e.to} name={e.to} />)}</span>
                            </div>
                          )}
                          {incTables.length > 0 && (
                            <div className="db-rel-row">
                              <span className="db-rel-l"><span className="db-reldot in" />referenced by</span>
                              <span className="db-rel-chips">{incTables.map((n) => <TableChip key={n} name={n} />)}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {INSIGHT[t.name] && <p className="db-insight"><b>Extract:</b> {INSIGHT[t.name]}</p>}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}

      {view === "relationships" && (
        <div className="db-relview">
          <p className="muted db-rel-intro">Every foreign-key correlation in the model — {EDGES.length} relationships across {SCHEMA.length} tables. Each edge is a join you can run: <code>child.column → parent.table.column</code>. Use <b>Copy JOIN</b> to paste a ready query into the SQL console.</p>

          <section className="db-domain">
            <div className="db-er-head">
              <h2 className="db-domain-h">ER diagram <span className="muted">· centred on</span></h2>
              <select className="field db-er-select" value={focus} onChange={(e) => setFocus(e.target.value)}>
                {SCHEMA.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div className="db-er card">
              <ErDiagram focus={focus} setFocus={setFocus} />
            </div>
          </section>

          <section className="db-domain">
            <h2 className="db-domain-h">Most-connected tables (join hubs)</h2>
            <div className="db-hubs">
              {hubs.map((h) => (
                <button key={h.t} className={`db-hub ${focus === h.t ? "is-focus" : ""}`} style={{ ["--accent" as string]: DOMAIN_ACCENT[TABLE_DOMAIN[h.t]] }} onClick={() => setFocus(h.t)}>
                  <div className="db-hub-top"><code>{h.t}</code><b>{h.n}</b></div>
                  <div className="db-hub-bar"><span style={{ width: `${(h.n / maxHub) * 100}%` }} /></div>
                  <span className="db-hub-sub">tables point here · view</span>
                </button>
              ))}
            </div>
          </section>

          <section className="db-domain">
            <h2 className="db-domain-h">All relationships (by table)</h2>
            <div className="db-edges">
              {SCHEMA.filter((t) => (OUT[t.name] ?? []).length > 0).map((t) => (
                <div key={t.name} className="db-edge-group card" style={{ ["--accent" as string]: DOMAIN_ACCENT[t.domain] }}>
                  <div className="db-edge-h"><Table2 size={13} /><code>{t.name}</code></div>
                  {(OUT[t.name] ?? []).map((e) => (
                    <div key={e.col + e.to} className="db-edge">
                      <code className="db-edge-c">{e.col}</code>
                      <ArrowRight size={12} className="db-edge-arr" />
                      <TableChip name={e.to} onClick={() => setFocus(e.to)} />
                      <code className="db-edge-rc">.{e.refCol}</code>
                      <CopyBtn text={joinSql(e)} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <p className="db-foot mono">
        Conventions: surrogate <code>uuid</code> keys use <code>gen_random_uuid()</code>; human-facing rows keep readable IDs (ENT-·, APP-·, CON-·).
        All FKs <code>ON DELETE RESTRICT</code> except junctions (<code>CASCADE</code>). Row-Level Security scopes entity/individual logins to their own <code>entity_id</code>.
      </p>
    </div>
  );
}
