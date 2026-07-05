import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Application, Entity, Individual, Pillar, PassType } from "@/domain/types";
import { APPLICATIONS, ENTITIES, INDIVIDUALS, AUDIT, type AuditEntry } from "@/lib/demoData";
import { useAuth } from "./auth";
import { ROLE_LABEL } from "@/domain/roles";
import { ROLE_ZONES, computeValidTo, today } from "@/domain/entitlements";
import { BASE_ROLES, newRole, type RoleDef, type Vertical, type Crud } from "@/domain/permissions";

// Persist the working set for the session so created records survive reloads.
function load<T>(key: string, fallback: T): T {
  try { const raw = sessionStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; }
  catch { return fallback; }
}

// Live in-memory store (seeded from demo data). Creation flows push here so
// new records appear across every screen, and each write logs a login-wise
// audit entry. Swapping this for the FastAPI backend is localised to here.

function nextId(items: { id: string }[], prefix: string, pad: number): string {
  const max = items.reduce((m, it) => {
    const n = parseInt(it.id.replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(pad, "0")}`;
}

function now(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export interface NewEntity { name: string; category: string; strength: number; policyRef: string; }
export interface NewIndividual { entityId: string; name: string; jobRole: string; loginAuthorized: boolean; }
export interface NewApplication {
  pillar: Pillar; entityId: string; subject: string; passType: PassType; zones: string[];
  jobRole?: string; validFrom: string;
}

export type RoleZoneMatrix = Record<string, string[]>;

interface DataCtx {
  entities: Entity[]; individuals: Individual[]; applications: Application[]; audit: AuditEntry[];
  roleZones: RoleZoneMatrix;
  roles: RoleDef[];
  createEntity: (e: NewEntity) => Entity;
  createIndividual: (i: NewIndividual) => Individual;
  createApplication: (a: NewApplication) => Application;
  setEntityZones: (entityId: string, zones: string[]) => void;   // BCAS / Admin edit
  setRoleZones: (role: string, zones: string[]) => void;         // BCAS / Admin edit
  createRole: (label: string) => void;                           // Admin / Operator / BCAS
  setPermission: (roleKey: string, vertical: Vertical, op: keyof Crud, val: boolean) => void;
  recordSlaJustification: (appId: string, note: string) => void;
  log: (action: string, object: string, detail: string, tone?: AuditEntry["tone"]) => void;
}

const Ctx = createContext<DataCtx>(null as unknown as DataCtx);

export function DataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [entities, setEntities] = useState<Entity[]>(() => load("aep-entities", ENTITIES));
  const [individuals, setIndividuals] = useState<Individual[]>(() => load("aep-individuals", INDIVIDUALS));
  const [applications, setApplications] = useState<Application[]>(() => load("aep-applications", APPLICATIONS));
  const [audit, setAudit] = useState<AuditEntry[]>(() => load("aep-audit", AUDIT));
  const [roleZones, setRoleZones_] = useState<RoleZoneMatrix>(() => load("aep-rolezones", ROLE_ZONES));
  const [roles, setRoles] = useState<RoleDef[]>(() => load("aep-roles", BASE_ROLES));

  useEffect(() => { sessionStorage.setItem("aep-entities", JSON.stringify(entities)); }, [entities]);
  useEffect(() => { sessionStorage.setItem("aep-individuals", JSON.stringify(individuals)); }, [individuals]);
  useEffect(() => { sessionStorage.setItem("aep-applications", JSON.stringify(applications)); }, [applications]);
  useEffect(() => { sessionStorage.setItem("aep-audit", JSON.stringify(audit)); }, [audit]);
  useEffect(() => { sessionStorage.setItem("aep-rolezones", JSON.stringify(roleZones)); }, [roleZones]);
  useEffect(() => { sessionStorage.setItem("aep-roles", JSON.stringify(roles)); }, [roles]);

  const log: DataCtx["log"] = (action, object, detail, tone = "ok") => {
    const actor = session?.name ?? "system";
    const role = session?.role ?? "system";
    setAudit((a) => [{ ts: now(), actor, role, action, object, detail, tone }, ...a]);
  };

  // Login / logout audit — records session start and end for every login.
  const prev = useRef<string | null>(null);
  useEffect(() => {
    const key = session ? `${session.role}:${session.name}` : null;
    if (key && key !== prev.current) {
      setAudit((a) => [{ ts: now(), actor: session!.name, role: session!.role, action: "login", object: "session", detail: `Signed in as ${ROLE_LABEL[session!.role]}`, tone: "ok" }, ...a]);
    } else if (!key && prev.current) {
      const [role, name] = prev.current.split(":");
      setAudit((a) => [{ ts: now(), actor: name, role, action: "logout", object: "session", detail: "Signed out", tone: "ok" }, ...a]);
    }
    prev.current = key;
  }, [session]);

  const setEntityZones: DataCtx["setEntityZones"] = (entityId, zones) => {
    setEntities((x) => x.map((e) => (e.id === entityId ? { ...e, entitledZones: zones } : e)));
    log("edit_entity_zones", entityId, `Entitled zones set to ${zones.join(" ") || "—"}`);
  };
  const setRoleZones: DataCtx["setRoleZones"] = (role, zones) => {
    setRoleZones_((m) => ({ ...m, [role]: zones }));
    log("edit_role_zones", role, `Role zone-need set to ${zones.join(" ") || "—"}`);
  };
  const createRole: DataCtx["createRole"] = (label) => {
    const r = newRole(label);
    setRoles((x) => [...x, r]);
    // Flagged to BCAS: a new role has no access until BCAS assigns it.
    log("create_role", r.key, `Role "${label}" created — awaiting BCAS access assignment`, "warn");
  };
  const setPermission: DataCtx["setPermission"] = (roleKey, vertical, op, val) => {
    setRoles((x) => x.map((r) => {
      if (r.key !== roleKey) return r;
      const perms = { ...r.perms, [vertical]: { ...r.perms[vertical], [op]: val } };
      const assigned = Object.values(perms).some((c) => c.c || c.r || c.u || c.d);
      return { ...r, perms, assigned };
    }));
    log("edit_permission", roleKey, `${vertical}.${op} = ${val}`);
  };

  const recordSlaJustification: DataCtx["recordSlaJustification"] = (appId, note) => {
    setApplications((x) => x.map((a) => (a.id === appId
      ? { ...a, stepLog: [...(a.stepLog ?? []), { stage: a.status, at: now(), by: session?.name, slaNote: note }] } : a)));
    log("sla_justification", appId, `SLA breach justified: ${note}`, "warn");
  };

  const createEntity: DataCtx["createEntity"] = (e) => {
    const ent: Entity = {
      id: nextId(entities, "ENT-", 2), name: e.name, category: e.category,
      status: "active", strength: e.strength, contractStart: now().slice(0, 10), contractEnd: "2028-03-31",
      aopLinked: false, entitledZones: [],
    };
    setEntities((x) => [...x, ent]);
    log("create_entity", ent.id, `${ent.name} · ${ent.category} · policy ${e.policyRef}`);
    return ent;
  };

  const createIndividual: DataCtx["createIndividual"] = (i) => {
    const ind: Individual = {
      id: nextId(individuals, "IND-", 2), entityId: i.entityId, name: i.name,
      jobRole: i.jobRole, hasLogin: i.loginAuthorized,
    };
    setIndividuals((x) => [...x, ind]);
    log("create_individual", ind.id, `${ind.name} · ${ind.jobRole}${i.loginAuthorized ? " · self-check login" : ""}`);
    return ind;
  };

  const createApplication: DataCtx["createApplication"] = (a) => {
    const from = a.validFrom || today();
    const { to, norm } = computeValidTo(a.passType, from);
    const ts = now();
    const app: Application = {
      id: nextId(applications, "APP-", 4), pillar: a.pillar, entityId: a.entityId, subject: a.subject,
      jobRole: a.jobRole, passType: a.passType, zones: a.zones, status: "checklist_pending",
      createdBy: ROLE_LABEL[session?.role ?? "operator"], createdAt: from, createdAtTs: ts,
      validFrom: from, validTo: to,
      stepLog: [{ stage: "intake", at: ts, by: session?.name }],
      clauseRef: a.pillar === "MATERIAL" ? "§12B" : a.pillar === "VEHICLE" ? "§12A" : "§5",
    };
    setApplications((x) => [app, ...x]);
    log("create_application", app.id, `${a.pillar} · ${a.passType} · ${a.subject} · valid to ${to} (${norm})`);
    return app;
  };

  return (
    <Ctx.Provider value={{
      entities, individuals, applications, audit, roleZones, roles,
      createEntity, createIndividual, createApplication,
      setEntityZones, setRoleZones, createRole, setPermission, recordSlaJustification, log,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useData = () => useContext(Ctx);
