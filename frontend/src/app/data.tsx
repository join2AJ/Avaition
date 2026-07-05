import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Application, ApplicationStatus, Entity, Individual, Pillar, PassType, Signatory, EntityDoc, EntityJobRole, Contract, Notification, ApprovalStage } from "@/domain/types";
import { APPLICATIONS, ENTITIES, INDIVIDUALS, AUDIT, CONTRACTS, STOP_LIST, type AuditEntry, type StopListEntry } from "@/lib/demoData";
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

export interface NewEntity {
  name: string; category: string; strength: number; policyRef: string;
  contractStart?: string; contractEnd?: string;
  signatories?: Signatory[]; docs?: EntityDoc[]; jobRoles?: EntityJobRole[];
}
export interface NewIndividual { entityId: string; name: string; jobRole: string; loginAuthorized: boolean; }
export interface NewApplication {
  pillar: Pillar; entityId: string; subject: string; passType: PassType; zones: string[];
  jobRole?: string; validFrom: string; contractId?: string;
}
export interface NewContract { entityId: string; counterparty: string; type: string; start: string; end: string; scope: string; copyFileName?: string; }

export type RoleZoneMatrix = Record<string, string[]>;

interface DataCtx {
  entities: Entity[]; individuals: Individual[]; applications: Application[]; audit: AuditEntry[];
  contracts: Contract[]; notifications: Notification[];
  roleZones: RoleZoneMatrix;
  roles: RoleDef[];
  createEntity: (e: NewEntity) => Entity;
  createIndividual: (i: NewIndividual) => Individual;
  createApplication: (a: NewApplication) => Application;
  advanceApplication: (appId: string, to: ApplicationStatus, opts?: { note?: string; action?: string }) => void;
  createContract: (c: NewContract) => Contract;
  terminateContract: (contractId: string) => void;
  advanceApproval: (entityId: string) => void;
  markNotificationsRead: () => void;
  stopList: StopListEntry[];
  isStopListed: (name: string) => StopListEntry | undefined;
  addStopList: (e: StopListEntry) => void;
  removeStopList: (name: string) => void;
  taepDaysUsed: (subject: string) => number;   // running TAEP days this calendar year
  screenStopList: (name: string) => void;       // logs a Stop List hit + urgent notify
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
  const [contracts, setContracts] = useState<Contract[]>(() => load("aep-contracts", CONTRACTS));
  const [notifications, setNotifications] = useState<Notification[]>(() => load("aep-notifs", []));
  const [stopList, setStopList] = useState<StopListEntry[]>(() => load("aep-stoplist", STOP_LIST));
  useEffect(() => { sessionStorage.setItem("aep-stoplist", JSON.stringify(stopList)); }, [stopList]);

  useEffect(() => { sessionStorage.setItem("aep-contracts", JSON.stringify(contracts)); }, [contracts]);
  useEffect(() => { sessionStorage.setItem("aep-notifs", JSON.stringify(notifications)); }, [notifications]);

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
  const notify = (to: string, type: string, message: string, tone: Notification["tone"] = "warn") => {
    setNotifications((n) => [{ id: `NTF-${Date.now()}-${Math.floor(Math.random() * 1000)}`, ts: now(), to, type, message, tone, read: false }, ...n]);
  };
  const markNotificationsRead: DataCtx["markNotificationsRead"] = () => setNotifications((n) => n.map((x) => ({ ...x, read: true })));

  const createContract: DataCtx["createContract"] = (c) => {
    const con: Contract = { id: nextId(contracts, "CON-", 2), status: "active", ...c };
    setContracts((x) => [...x, con]);
    log("create_contract", con.id, `${con.counterparty} · ${con.type} · till ${con.end}`);
    return con;
  };

  // Contract termination cascade — passes raised under it move to surrendered
  // (terminated category), and everyone concerned is intimated. An individual
  // whose zones are still covered by another active contract is unaffected;
  // one whose zones would shrink must re-apply (§10.7 · §10.3).
  const terminateContract: DataCtx["terminateContract"] = (contractId) => {
    const con = contracts.find((c) => c.id === contractId);
    if (!con) return;
    setContracts((x) => x.map((c) => (c.id === contractId ? { ...c, status: "terminated" } : c)));

    const affected = applications.filter((a) => a.contractId === contractId && a.status !== "surrendered");
    setApplications((x) => x.map((a) => (a.contractId === contractId ? { ...a, status: "surrendered" } : a)));

    // Which individuals lose zones vs stay covered by their other contracts.
    const otherActive = applications.filter((a) => a.contractId !== contractId && a.status !== "surrendered" && a.status !== "rejected");
    const reapply: string[] = [];
    const unaffected: string[] = [];
    affected.filter((a) => a.pillar === "MAN").forEach((a) => {
      const covered = new Set(otherActive.filter((o) => o.subject === a.subject).flatMap((o) => o.zones));
      const lost = a.zones.filter((z) => !covered.has(z));
      (lost.length ? reapply : unaffected).push(a.subject);
    });

    const ent = entities.find((e) => e.id === con.entityId);
    log("terminate_contract", contractId, `${con.counterparty} · ${affected.length} passes terminated`, "bad");
    notify("entity", "contract_terminated", `Contract ${contractId} (${con.counterparty}) terminated — ${affected.length} passes surrendered. Complete closing formalities within 7 days (§10.7).`, "bad");
    notify("bcas", "contract_terminated", `${ent?.name ?? con.entityId}: contract ${contractId} terminated — ${affected.length} passes moved to surrender.`, "bad");
    if (reapply.length) notify("individual", "reapply_required", `Zone reduction after contract ${contractId} ended: ${Array.from(new Set(reapply)).join(", ")} must re-apply for reduced access.`, "warn");
    if (unaffected.length) notify("individual", "coverage_ok", `Contract ${contractId} ended but zones remain covered by another contract for: ${Array.from(new Set(unaffected)).join(", ")}.`, "ok");
  };

  const advanceApproval: DataCtx["advanceApproval"] = (entityId) => {
    const order: ApprovalStage[] = ["registration", "documentation", "matrix", "verification", "bcas_approved"];
    setEntities((x) => x.map((e) => {
      if (e.id !== entityId) return e;
      const cur = e.approvalStage ?? "registration";
      const next = order[Math.min(order.indexOf(cur) + 1, order.length - 1)];
      log("advance_approval", entityId, `${cur} → ${next}`);
      if (next === "bcas_approved") notify("entity", "registration_approved", `${e.name}: registration approved by BCAS — you may now raise passes.`, "ok");
      return { ...e, approvalStage: next };
    }));
  };

  const isStopListed: DataCtx["isStopListed"] = (name) =>
    stopList.find((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase());
  const addStopList: DataCtx["addStopList"] = (e) => { setStopList((x) => [e, ...x]); log("stoplist_add", e.name, `${e.reason} · ${e.source}`, "warn"); };
  const removeStopList: DataCtx["removeStopList"] = (name) => { setStopList((x) => x.filter((s) => s.name !== name)); log("stoplist_remove", name, "Removed from Stop List"); };
  const screenStopList: DataCtx["screenStopList"] = (name) => {
    log("stoplist_hit", name, "Application blocked — name on Stop List (§9)", "bad");
    notify("operator", "stoplist_hit", `URGENT: ${name} matched the Stop List — application hard-blocked (§9).`, "bad");
  };

  // Running TAEP days used by an individual this calendar year (§8.3.4.3).
  const taepDaysUsed: DataCtx["taepDaysUsed"] = (subject) => {
    const yr = new Date().getFullYear();
    return applications
      .filter((a) => a.subject === subject && a.passType === "TAEP" && new Date(a.createdAt).getFullYear() === yr)
      .reduce((sum, a) => {
        if (!a.validFrom || !a.validTo) return sum + 1;
        const d = Math.max(1, Math.round((+new Date(a.validTo) - +new Date(a.validFrom)) / 86400000));
        return sum + d;
      }, 0);
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
    // Entity's entitled zones seed from the union of its job-role zone requests.
    const zoneSet = new Set<string>();
    (e.jobRoles ?? []).forEach((jr) => jr.zones.forEach((z) => zoneSet.add(z)));
    const ent: Entity = {
      id: nextId(entities, "ENT-", 2), name: e.name, category: e.category,
      status: "active", strength: e.strength,
      contractStart: e.contractStart || now().slice(0, 10), contractEnd: e.contractEnd || "2028-03-31",
      aopLinked: (e.docs ?? []).some((d) => /AOP|NSOP/i.test(d.name) && (d.reference || d.fileName)),
      entitledZones: Array.from(zoneSet),
      signatories: e.signatories, docs: e.docs, jobRoles: e.jobRoles,
    };
    setEntities((x) => [...x, ent]);
    // Register any new job roles + their zone-need matrix.
    (e.jobRoles ?? []).forEach((jr) => { if (jr.role) setRoleZones_((m) => ({ ...m, [jr.role]: jr.zones })); });
    const sigCount = (e.signatories ?? []).length;
    log("create_entity", ent.id,
      `${ent.name} · ${ent.category} · ${sigCount} signatories · ${(e.docs ?? []).length} docs · policy ${e.policyRef}`);
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
    const contractEnd = contracts.find((c) => c.id === a.contractId)?.end;
    const { to, norm } = computeValidTo(a.passType, from, contractEnd);
    const ts = now();
    const app: Application = {
      id: nextId(applications, "APP-", 4), pillar: a.pillar, entityId: a.entityId, subject: a.subject,
      contractId: a.contractId,
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

  // Drive a raised pass through its lifecycle: checklist → committee → approve
  // → issue → surrender (with clarification / reject branches). Each transition
  // appends a timestamped step, writes the login-wise audit, and intimates the
  // entity / BCAS on the key state changes (§8.3.2 · §8.3.3 · §15 · §10.7).
  const advanceApplication: DataCtx["advanceApplication"] = (appId, to, opts) => {
    const app = applications.find((a) => a.id === appId);
    if (!app) return;
    const stageMap: Record<ApplicationStatus, string> = {
      draft: "intake", checklist_pending: "checklist", clarification: "checklist",
      committee_scheduled: "committee", approved: "issue", issued: "handover",
      rejected: "committee", parked: "handover", deactivated: "handover",
      withdrawn: "closed", surrendered: "closed",
    };
    const ts = now();
    setApplications((x) => x.map((a) => (a.id === appId
      ? { ...a, status: to, stepLog: [...(a.stepLog ?? []), { stage: stageMap[to] ?? to, at: ts, by: session?.name, note: opts?.note, action: opts?.action }] }
      : a)));
    const tone: AuditEntry["tone"] = to === "rejected" || to === "withdrawn" ? "bad"
      : to === "clarification" || to === "surrendered" || to === "parked" || to === "deactivated" ? "warn" : "ok";
    log("advance_application", appId, `${app.subject}: ${app.status} → ${to}${opts?.note ? ` · ${opts.note}` : ""}`, tone);
    if (to === "issued") notify("entity", "pass_issued", `${app.subject}: ${app.passType} pass ${app.status === "checklist_pending" || app.status === "approved" ? "approved & issued — ready for print / handover" : "reinstated"} (${appId}).`, "ok");
    else if (to === "rejected") notify("entity", "pass_rejected", `${app.subject}: application ${appId} rejected${opts?.note ? ` — ${opts.note}` : ""}.`, "bad");
    else if (to === "clarification") notify("entity", "clarification", `${app.subject}: clarification required on ${appId}${opts?.note ? ` — ${opts.note}` : ""}.`, "warn");
    else if (to === "surrendered") notify("bcas", "pass_surrendered", `${app.subject}: pass ${appId} surrendered${opts?.note ? ` — ${opts.note}` : ""} (§10.7).`, "warn");
    else if (to === "approved") notify("operator", "pass_approved", `${app.subject}: ${appId} approved at committee — proceed to issue (§15).`, "ok");
    else if (to === "parked") notify("entity", "pass_parked", `${app.subject}: pass ${appId} parked for non-use${opts?.note ? ` — ${opts.note}` : ""}. Un-park within norms or it lapses (§10.6).`, "warn");
    else if (to === "deactivated") notify("entity", "pass_deactivated", `${app.subject}: pass ${appId} deactivated (compliance hold)${opts?.note ? ` — ${opts.note}` : ""}. Clear the deficiency to reactivate (§10 · §13).`, "warn");
    else if (to === "withdrawn") { notify("entity", "pass_withdrawn", `${app.subject}: pass ${appId} WITHDRAWN${opts?.note ? ` — ${opts.note}` : ""}. Surrender the card immediately (§11).`, "bad"); notify("bcas", "pass_withdrawn", `${app.subject}: ${appId} withdrawn (§11)${opts?.note ? ` — ${opts.note}` : ""}.`, "bad"); }
  };

  return (
    <Ctx.Provider value={{
      entities, individuals, applications, audit, contracts, notifications, roleZones, roles,
      createEntity, createIndividual, createApplication, advanceApplication, createContract, terminateContract,
      advanceApproval, markNotificationsRead,
      stopList, isStopListed, addStopList, removeStopList, taepDaysUsed, screenStopList,
      setEntityZones, setRoleZones, createRole, setPermission, recordSlaJustification, log,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useData = () => useContext(Ctx);
