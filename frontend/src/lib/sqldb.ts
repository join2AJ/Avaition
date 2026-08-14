// ---------------------------------------------------------------------------
// In-browser SQLite for the Super-Admin SQL console. Uses sql.js's pure-JS
// (asm.js) build so it runs under a strict `script-src 'self'` CSP with no
// WASM/eval and no network fetch — works identically on Netlify and in the
// self-contained demo bundle. The schema is generated from the SAME SCHEMA
// that powers the schema browser, then seeded with the app's demo rows.
//
// NOTE: this is a client-side sandbox seeded from demo data — edits persist to
// localStorage for the session. In production this console would proxy SQL to
// the FastAPI backend + PostgreSQL instead of running locally.
// ---------------------------------------------------------------------------
import initSqlJs from "sql.js/dist/sql-asm.js";
import { SCHEMA, type Tbl } from "@/pages/Database";
import { BASE_ROLES, VERTICALS } from "@/domain/permissions";
import { ZONES } from "@/domain/zones";
import {
  ENTITIES, INDIVIDUALS, CONTRACTS, APPLICATIONS, STOP_LIST, SURRENDERS,
  ZONE_ESCALATIONS, COMMITTEES, AUDIT,
} from "@/lib/demoData";

export interface QueryResult {
  columns: string[];
  rows: (string | number | null)[][];
  rowsAffected: number;
  command: string;   // SELECT / INSERT / UPDATE / DELETE / …
  elapsedMs: number;
}

// SqlJs types are loose; keep a minimal local shape.
type SqlDb = {
  run: (sql: string, params?: unknown[]) => void;
  exec: (sql: string) => { columns: string[]; values: (string | number | null)[][] }[];
  getRowsModified: () => number;
  export: () => Uint8Array;
};

const LS_KEY = "aep-sqldb";
let dbPromise: Promise<SqlDb> | null = null;

/** Map a documented (Postgres) type to a SQLite column type. SQLite is
 *  permissive (type affinity), so most names pass through unchanged. */
function sqliteType(t: string): string {
  if (/^(integer|smallint|bigint)/.test(t)) return "INTEGER";
  if (/^(numeric|real|double)/.test(t)) return "REAL";
  if (/^boolean/.test(t)) return "INTEGER"; // 0/1
  return "TEXT"; // varchar/text/uuid/date/timestamptz/inet/text[]/jsonb
}

/** CREATE TABLE DDL for one table — primary keys (incl. composite) are emitted;
 *  FKs are documented in the schema browser but left unenforced here so CRUD in
 *  the sandbox never trips on insertion order. */
function tableDDL(t: Tbl): string {
  const pkCols = t.cols.filter((c) => c.key?.includes("PK")).map((c) => c.name);
  const composite = pkCols.length > 1;
  const lines = t.cols.map((c) => {
    let line = `  "${c.name}" ${sqliteType(c.type)}`;
    if (!composite && c.key?.includes("PK")) line += " PRIMARY KEY";
    if (!c.nullable && !c.key?.includes("PK")) line += ""; // keep nullable-friendly for demo inserts
    return line;
  });
  if (composite) lines.push(`  PRIMARY KEY (${pkCols.map((c) => `"${c}"`).join(", ")})`);
  return `CREATE TABLE IF NOT EXISTS "${t.name}" (\n${lines.join(",\n")}\n);`;
}

export function buildDDL(): string {
  return SCHEMA.map(tableDDL).join("\n\n");
}

const b = (v: boolean | undefined) => (v ? 1 : 0);
const now = "2026-08-14 09:00:00";

/** Insert rows described as {col: value} objects, only using known columns. */
function seedTable(db: SqlDb, table: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const ph = cols.map(() => "?").join(", ");
  const sql = `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${ph})`;
  for (const r of rows) {
    db.run(sql, cols.map((c) => {
      const v = r[c];
      if (v === undefined || v === null) return null;
      if (typeof v === "boolean") return v ? 1 : 0;
      if (Array.isArray(v)) return v.join(" ");
      return v as string | number;
    }));
  }
}

function seed(db: SqlDb) {
  // Identity & Access
  seedTable(db, "roles", BASE_ROLES.map((r) => ({
    role_key: r.key, label: r.label, custom: b(r.custom), assigned: b(r.assigned), created_at: now,
  })));
  seedTable(db, "verticals", VERTICALS.map((v) => ({ name: v, description: `${v} feature-category` })));
  const perm: Record<string, unknown>[] = [];
  for (const r of BASE_ROLES)
    for (const v of VERTICALS) {
      const c = r.perms[v];
      perm.push({ role_key: r.key, vertical: v, can_create: b(c.c), can_read: b(c.r), can_update: b(c.u), can_delete: b(c.d) });
    }
  seedTable(db, "role_permissions", perm);

  // Entity Registration
  const cats = Array.from(new Set(ENTITIES.map((e) => e.category)));
  seedTable(db, "entity_categories", cats.map((c) => ({
    code: c, label: c, operator_devised: b(/material|tool/i.test(c)),
  })));
  seedTable(db, "entities", ENTITIES.map((e) => ({
    id: e.id, name: e.name, category: e.category, status: e.status, strength: e.strength,
    contract_start: e.contractStart, contract_end: e.contractEnd, aop_linked: b(e.aopLinked),
    approval_stage: e.approvalStage ?? "bcas_approved", created_at: now,
  })));
  seedTable(db, "contracts", CONTRACTS.map((c) => ({
    id: c.id, entity_id: c.entityId, counterparty: c.counterparty, type: c.type,
    start_date: c.start, end_date: c.end, copy_file_name: c.copyFileName ?? null, scope: c.scope, status: c.status,
  })));

  // People
  seedTable(db, "individuals", INDIVIDUALS.map((i) => ({
    id: i.id, entity_id: i.entityId, name: i.name, job_role: i.jobRole, has_login: b(i.hasLogin),
    state: i.state ?? null, district: i.district ?? null, religion: i.religion ?? null,
    blood_group: i.bloodGroup ?? null, avsec_training_expiry: i.avsecTrainingExpiry ?? null,
  })));

  // Applications & Passes
  seedTable(db, "applications", APPLICATIONS.map((a) => ({
    id: a.id, pillar_key: a.pillar, entity_id: a.entityId, contract_id: a.contractId ?? null,
    committee_id: null, pass_type: a.passType, subject: a.subject, job_role: a.jobRole ?? null,
    escort: a.escort ?? null, status: a.status, created_by: a.createdBy, created_at: a.createdAt,
    created_at_ts: a.createdAtTs ?? a.createdAt, valid_from: a.validFrom ?? null, valid_to: a.validTo ?? null,
    expiry_date: a.expiryDate ?? null, clause_ref: a.clauseRef,
  })));

  // Zones & Access
  seedTable(db, "zones", ZONES.map((z) => ({ code: z.code, label: z.label, sra: b(z.sra) })));
  seedTable(db, "zone_escalations", ZONE_ESCALATIONS.map((e) => ({
    id: e.id, entity_id: e.entityId, application_id: e.appId ?? null, subject: e.subject,
    requested: e.requested.join(" "), exceeded: e.exceeded.join(" "), justification: e.justification,
    status: e.status, since: e.since,
  })));

  // Compliance & Enforcement
  seedTable(db, "stop_list", STOP_LIST.map((s, i) => ({
    id: `SL-${i + 1}`, name: s.name, reason: s.reason, source: s.source, since: s.since,
  })));
  seedTable(db, "surrenders", SURRENDERS.map((s) => ({
    id: s.id, application_id: s.applicationId, entity_id: s.entityId, holder: s.holder, reason: s.reason,
    exit_date: s.exitDate, due_date: s.dueDate, days_late: s.daysLate,
    entity_justification: s.entityJustification ?? null, penalty: s.penalty ?? null, penalty_status: s.penaltyStatus ?? null,
  })));

  // Committees
  seedTable(db, "committees", COMMITTEES.map((c) => ({
    id: c.id, name: `Committee ${c.id}`, scheduled_date: c.date, chair: c.chair, status: "scheduled",
  })));

  // System & Reference
  seedTable(db, "audit_log", AUDIT.map((a, i) => ({
    id: `AUD-${i + 1}`, ts: a.ts, actor: a.actor, role_key: a.role, action: a.action,
    object: a.object, detail: a.detail, tone: a.tone,
  })));
}

async function build(): Promise<SqlDb> {
  const SQL = await initSqlJs();
  const saved = localStorage.getItem(LS_KEY);
  if (saved) {
    try {
      const bytes = Uint8Array.from(atob(saved), (ch) => ch.charCodeAt(0));
      return new SQL.Database(bytes) as unknown as SqlDb;
    } catch {
      localStorage.removeItem(LS_KEY);
    }
  }
  const db = new SQL.Database() as unknown as SqlDb;
  db.run(buildDDL());
  seed(db);
  persist(db);
  return db;
}

export function getDb(): Promise<SqlDb> {
  if (!dbPromise) dbPromise = build();
  return dbPromise;
}

export function persist(db: SqlDb) {
  const bytes = db.export();
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  localStorage.setItem(LS_KEY, btoa(bin));
}

export async function resetDb() {
  localStorage.removeItem(LS_KEY);
  dbPromise = null;
  await getDb();
}

/** Run one or more SQL statements; returns the result of the LAST statement. */
export async function runSql(sql: string): Promise<QueryResult> {
  const db = await getDb();
  const started = performance.now();
  const command = (sql.trim().split(/\s+/)[0] || "").toUpperCase();
  const isSelect = /^(SELECT|PRAGMA|WITH|EXPLAIN)/i.test(sql.trim());
  if (isSelect) {
    const res = db.exec(sql);
    const last = res[res.length - 1];
    return {
      columns: last?.columns ?? [],
      rows: last?.values ?? [],
      rowsAffected: last?.values.length ?? 0,
      command, elapsedMs: performance.now() - started,
    };
  }
  db.run(sql);
  const rowsAffected = db.getRowsModified();
  persist(db);
  return { columns: [], rows: [], rowsAffected, command, elapsedMs: performance.now() - started };
}

export const TABLE_NAMES = SCHEMA.map((t) => t.name);
