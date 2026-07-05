import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Application, Entity, Individual, Pillar, PassType } from "@/domain/types";
import { APPLICATIONS, ENTITIES, INDIVIDUALS, AUDIT, type AuditEntry } from "@/lib/demoData";
import { useAuth } from "./auth";
import { ROLE_LABEL } from "@/domain/roles";

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
}

interface DataCtx {
  entities: Entity[]; individuals: Individual[]; applications: Application[]; audit: AuditEntry[];
  createEntity: (e: NewEntity) => Entity;
  createIndividual: (i: NewIndividual) => Individual;
  createApplication: (a: NewApplication) => Application;
  log: (action: string, object: string, detail: string, tone?: AuditEntry["tone"]) => void;
}

const Ctx = createContext<DataCtx>(null as unknown as DataCtx);

export function DataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [entities, setEntities] = useState<Entity[]>(() => load("aep-entities", ENTITIES));
  const [individuals, setIndividuals] = useState<Individual[]>(() => load("aep-individuals", INDIVIDUALS));
  const [applications, setApplications] = useState<Application[]>(() => load("aep-applications", APPLICATIONS));
  const [audit, setAudit] = useState<AuditEntry[]>(() => load("aep-audit", AUDIT));

  useEffect(() => { sessionStorage.setItem("aep-entities", JSON.stringify(entities)); }, [entities]);
  useEffect(() => { sessionStorage.setItem("aep-individuals", JSON.stringify(individuals)); }, [individuals]);
  useEffect(() => { sessionStorage.setItem("aep-applications", JSON.stringify(applications)); }, [applications]);
  useEffect(() => { sessionStorage.setItem("aep-audit", JSON.stringify(audit)); }, [audit]);

  const log: DataCtx["log"] = (action, object, detail, tone = "ok") => {
    const actor = session?.name ?? "system";
    const role = session?.role ?? "system";
    setAudit((a) => [{ ts: now(), actor, role, action, object, detail, tone }, ...a]);
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
    const app: Application = {
      id: nextId(applications, "APP-", 4), pillar: a.pillar, entityId: a.entityId, subject: a.subject,
      passType: a.passType, zones: a.zones, status: "checklist_pending",
      createdBy: ROLE_LABEL[session?.role ?? "operator"], createdAt: now().slice(0, 10),
      clauseRef: a.pillar === "MATERIAL" ? "§12B" : a.pillar === "VEHICLE" ? "§12A" : "§5",
    };
    setApplications((x) => [app, ...x]);
    log("create_application", app.id, `${a.pillar} · ${a.passType} · ${a.subject}`);
    return app;
  };

  return (
    <Ctx.Provider value={{ entities, individuals, applications, audit, createEntity, createIndividual, createApplication, log }}>
      {children}
    </Ctx.Provider>
  );
}

export const useData = () => useContext(Ctx);
