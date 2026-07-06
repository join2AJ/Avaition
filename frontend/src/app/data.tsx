import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Application, ApplicationStatus, Entity, Individual, Pillar, PassType, Signatory, EntityDoc, EntityJobRole, Contract, Notification, ApprovalStage } from "@/domain/types";
import { APPLICATIONS, ENTITIES, INDIVIDUALS, AUDIT, CONTRACTS, STOP_LIST, SURRENDERS, type AuditEntry, type StopListEntry, type Surrender } from "@/lib/demoData";
import { useAuth } from "./auth";
import { ROLE_LABEL } from "@/domain/roles";
import { ROLE_ZONES, computeValidTo, today } from "@/domain/entitlements";
import { trainingState, nextRefresherDate } from "@/domain/training";
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
  jobRole?: string; validFrom: string; contractId?: string; escort?: string;
}
export interface NewContract { entityId: string; counterparty: string; type: string; start: string; end: string; scope: string; copyFileName?: string; }

export type RoleZoneMatrix = Record<string, string[]>;

interface DataCtx {
  entities: Entity[]; individuals: Individual[]; applications: Application[]; audit: AuditEntry[];
  contracts: Contract[]; notifications: Notification[]; surrenders: Surrender[];
  roleZones: RoleZoneMatrix;
  roles: RoleDef[];
  createEntity: (e: NewEntity) => Entity;
  createIndividual: (i: NewIndividual) => Individual;
  createApplication: (a: NewApplication) => Application;
  advanceApplication: (appId: string, to: ApplicationStatus, opts?: { note?: string; action?: string }) => void;
  createContract: (c: NewContract) => Contract;
  terminateContract: (contractId: string) => void;
  renewContract: (contractId: string, newEnd: string, confirmedZones: string[]) => void;
  advanceApproval: (entityId: string) => void;
  recordSurrenderJustification: (id: string, text: string) => void;  // §10.7 — entity's late-surrender reason
  raiseSurrenderPenalty: (id: string, text: string) => void;         // §10.8 — BCAS penalty with justification
  resolveSurrenderPenalty: (id: string) => void;
  applyTrainingHolds: () => number;                       // §13 — auto-deactivate lapsed-training holders' passes
  recordAvsecRefresher: (individualId: string) => void;   // §13 — refresher recorded → reactivate held passes
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
  const [surrenders, setSurrenders] = useState<Surrender[]>(() => load("aep-surrenders", SURRENDERS));
  useEffect(() => { sessionStorage.setItem("aep-stoplist", JSON.stringify(stopList)); }, [stopList]);
  useEffect(() => { sessionStorage.setItem("aep-surrenders", JSON.stringify(surrenders)); }, [surrenders]);

  // Append surrender/penalty-tracker records with sequential SUR- ids (§10.7).
  const appendSurrenders = (recs: Omit<Surrender, "id">[]) => {
    if (!recs.length) return;
    setSurrenders((prev) => {
      let max = prev.reduce((m, s) => { const n = parseInt(s.id.replace(/\D/g, ""), 10); return Number.isFinite(n) && n > m ? n : m; }, 0);
      const withIds = recs.map((r) => ({ id: `SUR-${String(++max).padStart(2, "0")}`, ...r }));
      return [...withIds, ...prev];
    });
  };
  const surrenderRecord = (applicationId: string, holder: string, entityId: string, reason: Surrender["reason"]): Omit<Surrender, "id"> => {
    const exitDate = today();
    const dueDate = new Date(+new Date(exitDate) + 7 * 86400000).toISOString().slice(0, 10);
    return { applicationId, holder, entityId, reason, exitDate, dueDate, daysLate: 0 };
  };

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

  // D2 — scheduled expiry intimations (§7A · §10.7 · §13). On mount, scan every
  // live pass, active contract and AVSEC-training date; anything crossing the
  // 30 / 14 / 3-day (or already-expired) threshold raises an intimation. Each
  // carries a deterministic id (bucket-scoped) so reloads never duplicate it.
  const expiryScanned = useRef(false);
  useEffect(() => {
    if (expiryScanned.current) return;
    expiryScanned.current = true;
    const t0 = +new Date(today());
    const bucketOf = (days: number): number | null =>
      days < 0 ? -1 : days <= 3 ? 3 : days <= 14 ? 14 : days <= 30 ? 30 : null;
    const events: { id: string; to: string; entityId?: string; message: string; tone: Notification["tone"] }[] = [];
    const push = (date: string | undefined, idBase: string, label: string, to: string, entityId?: string) => {
      if (!date) return;
      const days = Math.round((+new Date(date) - t0) / 86400000);
      const b = bucketOf(days);
      if (b === null) return;
      const phrase = b === -1 ? "has EXPIRED — action overdue" : `expires in ${days} day${days === 1 ? "" : "s"} (≤ ${b}-day intimation)`;
      events.push({ id: `EXP-${idBase}-${b}`, to, entityId, message: `${label} ${phrase}.`, tone: b === -1 || b === 3 ? "bad" : "warn" });
    };
    applications.forEach((a) => { if (a.status === "issued") push(a.expiryDate || a.validTo, `PASS-${a.id}`, `${a.subject}: ${a.passType} pass ${a.id}`, "entity", a.entityId); });
    contracts.forEach((c) => { if (c.status === "active") push(c.end, `CON-${c.id}`, `Contract ${c.id} · ${c.counterparty}`, "entity", c.entityId); });
    individuals.forEach((i) => push(i.avsecTrainingExpiry, `TRN-${i.id}`, `${i.name}: AVSEC training`, "entity", i.entityId));

    if (events.length) {
      setNotifications((prev) => {
        const have = new Set(prev.map((n) => n.id));
        const add = events.filter((e) => !have.has(e.id)).map((e) => ({ id: e.id, ts: now(), to: e.to, entityId: e.entityId, type: "expiry", message: e.message, tone: e.tone, read: false }));
        return add.length ? [...add, ...prev] : prev;
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setEntityZones: DataCtx["setEntityZones"] = (entityId, zones) => {
    setEntities((x) => x.map((e) => (e.id === entityId ? { ...e, entitledZones: zones } : e)));
    log("edit_entity_zones", entityId, `Entitled zones set to ${zones.join(" ") || "—"}`);
  };
  const setRoleZones: DataCtx["setRoleZones"] = (role, zones) => {
    setRoleZones_((m) => ({ ...m, [role]: zones }));
    log("edit_role_zones", role, `Role zone-need set to ${zones.join(" ") || "—"}`);
  };
  const notify = (to: string, type: string, message: string, tone: Notification["tone"] = "warn", entityId?: string) => {
    setNotifications((n) => [{ id: `NTF-${Date.now()}-${Math.floor(Math.random() * 1000)}`, ts: now(), to, entityId, type, message, tone, read: false }, ...n]);
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
    appendSurrenders(affected.map((a) => surrenderRecord(a.id, a.subject, con.entityId, "terminated")));
    log("terminate_contract", contractId, `${con.counterparty} · ${affected.length} passes terminated`, "bad");
    notify("entity", "contract_terminated", `Contract ${contractId} (${con.counterparty}) terminated — ${affected.length} passes surrendered. Complete closing formalities within 7 days (§10.7).`, "bad", con.entityId);
    notify("bcas", "contract_terminated", `${ent?.name ?? con.entityId}: contract ${contractId} terminated — ${affected.length} passes moved to surrender.`, "bad");
    if (reapply.length) notify("individual", "reapply_required", `Zone reduction after contract ${contractId} ended: ${Array.from(new Set(reapply)).join(", ")} must re-apply for reduced access.`, "warn");
    if (unaffected.length) notify("individual", "coverage_ok", `Contract ${contractId} ended but zones remain covered by another contract for: ${Array.from(new Set(unaffected)).join(", ")}.`, "ok");
  };

  // Contract renewal (§7A · §10) — extend the contract, re-confirm the entity's
  // entitled zones for the new term, and slide every co-terminus pass forward to
  // the new norm-capped date. A pass zone dropped at re-confirmation is removed
  // and the holder is told to re-apply for it. Renewal reverses expiry.
  const renewContract: DataCtx["renewContract"] = (contractId, newEnd, confirmedZones) => {
    const con = contracts.find((c) => c.id === contractId);
    if (!con) return;
    setContracts((x) => x.map((c) => (c.id === contractId ? { ...c, end: newEnd, status: "active" } : c)));
    setEntities((x) => x.map((e) => (e.id === con.entityId ? { ...e, entitledZones: confirmedZones, contractEnd: newEnd } : e)));
    const ts = now();
    const shrunk = new Set<string>();
    let extended = 0;
    setApplications((x) => x.map((a) => {
      if (a.contractId !== contractId || ["surrendered", "rejected", "withdrawn"].includes(a.status)) return a;
      const { to } = computeValidTo(a.passType, a.validFrom || today(), newEnd);
      const zones = a.zones.filter((z) => confirmedZones.includes(z));
      if (zones.length < a.zones.length) shrunk.add(a.subject);
      extended += 1;
      return { ...a, zones, validTo: to, stepLog: [...(a.stepLog ?? []), { stage: a.status === "issued" ? "handover" : "intake", at: ts, by: session?.name ?? "system", action: "Contract renewed", note: `Co-terminus validity extended to ${to}; zones re-confirmed (§7A)` }] };
    }));
    const ent = entities.find((e) => e.id === con.entityId);
    log("renew_contract", contractId, `${con.counterparty} renewed till ${newEnd} · ${extended} passes extended · zones re-confirmed ${confirmedZones.join(" ") || "—"}`);
    notify("entity", "contract_renewed", `Contract ${contractId} (${con.counterparty}) renewed till ${newEnd}. ${extended} pass(es) extended co-terminus; entitled zones re-confirmed (§7A).`, "ok", con.entityId);
    notify("bcas", "contract_renewed", `${ent?.name ?? con.entityId}: contract ${contractId} renewed till ${newEnd} — zones re-confirmed.`, "ok");
    if (shrunk.size) notify("individual", "reapply_required", `Zone(s) dropped at renewal of ${contractId}: ${Array.from(shrunk).join(", ")} must re-apply for the removed access.`, "warn");
  };

  const recordSurrenderJustification: DataCtx["recordSurrenderJustification"] = (id, text) => {
    setSurrenders((x) => x.map((s) => (s.id === id ? { ...s, entityJustification: text } : s)));
    const s = surrenders.find((r) => r.id === id);
    log("surrender_justification", id, `Entity justification: ${text}`, "warn");
    notify("bcas", "surrender_justification", `${s?.holder ?? id} (${s?.applicationId ?? ""}): entity submitted a late-surrender justification — ${text} (§10.7).`, "warn");
  };
  const raiseSurrenderPenalty: DataCtx["raiseSurrenderPenalty"] = (id, text) => {
    setSurrenders((x) => x.map((s) => (s.id === id ? { ...s, penalty: text, penaltyStatus: "open" } : s)));
    const s = surrenders.find((r) => r.id === id);
    log("raise_penalty", id, `BCAS penalty raised: ${text}`, "bad");
    notify("entity", "penalty_raised", `Penalty raised on ${s?.applicationId ?? id} (${s?.holder ?? ""}): ${text} (§10.8).`, "bad", s?.entityId);
  };
  const resolveSurrenderPenalty: DataCtx["resolveSurrenderPenalty"] = (id) => {
    setSurrenders((x) => x.map((s) => (s.id === id ? { ...s, penaltyStatus: "resolved" } : s)));
    log("resolve_penalty", id, "Penalty resolved / closed", "ok");
  };

  const advanceApproval: DataCtx["advanceApproval"] = (entityId) => {
    const order: ApprovalStage[] = ["registration", "documentation", "matrix", "verification", "bcas_approved"];
    setEntities((x) => x.map((e) => {
      if (e.id !== entityId) return e;
      const cur = e.approvalStage ?? "registration";
      const next = order[Math.min(order.indexOf(cur) + 1, order.length - 1)];
      log("advance_approval", entityId, `${cur} → ${next}`);
      if (next === "bcas_approved") notify("entity", "registration_approved", `${e.name}: registration approved by BCAS — you may now raise passes.`, "ok", e.id);
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
      jobRole: a.jobRole, passType: a.passType, zones: a.zones, escort: a.escort, status: "checklist_pending",
      createdBy: ROLE_LABEL[session?.role ?? "operator"], createdAt: from, createdAtTs: ts,
      validFrom: from, validTo: to,
      stepLog: [{ stage: "intake", at: ts, by: session?.name }],
      clauseRef: a.pillar === "MATERIAL" ? "§12B" : a.pillar === "VEHICLE" ? "§12A" : "§5",
    };
    setApplications((x) => [app, ...x]);
    log("create_application", app.id, `${a.pillar} · ${a.passType} · ${a.subject} · valid to ${to} (${norm})${a.escort ? ` · escort ${a.escort}` : ""}`);
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
    if (to === "issued") notify("entity", "pass_issued", `${app.subject}: ${app.passType} pass ${app.status === "checklist_pending" || app.status === "approved" ? "approved & issued — ready for print / handover" : "reinstated"} (${appId}).`, "ok", app.entityId);
    else if (to === "rejected") notify("entity", "pass_rejected", `${app.subject}: application ${appId} rejected${opts?.note ? ` — ${opts.note}` : ""}.`, "bad", app.entityId);
    else if (to === "clarification") notify("entity", "clarification", `${app.subject}: clarification required on ${appId}${opts?.note ? ` — ${opts.note}` : ""}.`, "warn", app.entityId);
    else if (to === "surrendered") { notify("bcas", "pass_surrendered", `${app.subject}: pass ${appId} surrendered${opts?.note ? ` — ${opts.note}` : ""} (§10.7).`, "warn"); appendSurrenders([surrenderRecord(appId, app.subject, app.entityId, "surrendered")]); }
    else if (to === "approved") notify("operator", "pass_approved", `${app.subject}: ${appId} approved at committee — proceed to issue (§15).`, "ok");
    else if (to === "parked") notify("entity", "pass_parked", `${app.subject}: pass ${appId} parked for non-use${opts?.note ? ` — ${opts.note}` : ""}. Un-park within norms or it lapses (§10.6).`, "warn", app.entityId);
    else if (to === "deactivated") notify("entity", "pass_deactivated", `${app.subject}: pass ${appId} deactivated (compliance hold)${opts?.note ? ` — ${opts.note}` : ""}. Clear the deficiency to reactivate (§10 · §13).`, "warn", app.entityId);
    else if (to === "withdrawn") {
      notify("entity", "pass_withdrawn", `${app.subject}: pass ${appId} WITHDRAWN${opts?.note ? ` — ${opts.note}` : ""}. Surrender the card immediately (§11).`, "bad", app.entityId);
      notify("bcas", "pass_withdrawn", `${app.subject}: ${appId} withdrawn (§11)${opts?.note ? ` — ${opts.note}` : ""}.`, "bad");
      appendSurrenders([surrenderRecord(appId, app.subject, app.entityId, "withdrawn")]);
      // §9/§11 — a withdrawn AEP holder is barred from re-applying: auto-add to
      // the Stop List so the Create screen screens them out on the next attempt.
      if (app.pillar === "MAN" && !isStopListed(app.subject)) {
        addStopList({ name: app.subject, reason: `AEP withdrawn (§11)${opts?.note ? ` — ${opts.note}` : ""}`, source: "BCAS RO", since: today() });
      }
    }
  };

  // §13 — AVSEC training lapse suspends access. Any currently-issued MAN pass
  // whose holder's AVSEC refresher has expired is auto-deactivated (compliance
  // hold), pending a recorded refresher. Returns how many passes were held.
  const applyTrainingHolds: DataCtx["applyTrainingHolds"] = () => {
    const lapsed = new Set(individuals.filter((i) => trainingState(i.avsecTrainingExpiry) === "lapsed").map((i) => i.name));
    const targets = applications.filter((a) => a.pillar === "MAN" && a.status === "issued" && lapsed.has(a.subject));
    if (targets.length === 0) { log("training_hold_run", "AVSEC", "No lapsed-training holders with a live pass (§13)"); return 0; }
    const ts = now();
    const ids = new Set(targets.map((t) => t.id));
    setApplications((x) => x.map((a) => (ids.has(a.id)
      ? { ...a, status: "deactivated", stepLog: [...(a.stepLog ?? []), { stage: "handover", at: ts, by: session?.name ?? "system", action: "Deactivate (compliance hold)", note: "AVSEC training lapsed — access held until refresher recorded (§13)" }] }
      : a)));
    targets.forEach((t) => notify("entity", "training_hold", `${t.subject}: AEP ${t.id} deactivated — AVSEC training lapsed. Record the refresher to reactivate (§13).`, "bad", t.entityId));
    notify("bcas", "training_hold", `${targets.length} AEP(s) deactivated for lapsed AVSEC training (§13).`, "warn");
    log("training_hold_run", "AVSEC", `${targets.length} pass(es) deactivated for lapsed AVSEC training (§13)`, "warn");
    return targets.length;
  };

  const recordAvsecRefresher: DataCtx["recordAvsecRefresher"] = (individualId) => {
    const ind = individuals.find((i) => i.id === individualId);
    if (!ind) return;
    const newExpiry = nextRefresherDate();
    setIndividuals((x) => x.map((i) => (i.id === individualId ? { ...i, avsecTrainingExpiry: newExpiry } : i)));
    // Reactivate any pass held specifically for this holder's training lapse.
    const ts = now();
    setApplications((x) => x.map((a) => (a.subject === ind.name && a.status === "deactivated"
      ? { ...a, status: "issued", stepLog: [...(a.stepLog ?? []), { stage: "handover", at: ts, by: session?.name ?? "system", action: "Reactivate", note: `AVSEC refresher recorded — valid to ${newExpiry} (§13)` }] }
      : a)));
    log("avsec_refresher", individualId, `${ind.name}: AVSEC refresher recorded — valid to ${newExpiry}`, "ok");
    notify("entity", "training_ok", `${ind.name}: AVSEC refresher recorded (valid to ${newExpiry}) — any held pass reactivated (§13).`, "ok", ind.entityId);
  };

  return (
    <Ctx.Provider value={{
      entities, individuals, applications, audit, contracts, notifications, surrenders, roleZones, roles,
      createEntity, createIndividual, createApplication, advanceApplication, createContract, terminateContract, renewContract,
      advanceApproval, recordSurrenderJustification, raiseSurrenderPenalty, resolveSurrenderPenalty,
      applyTrainingHolds, recordAvsecRefresher, markNotificationsRead,
      stopList, isStopListed, addStopList, removeStopList, taepDaysUsed, screenStopList,
      setEntityZones, setRoleZones, createRole, setPermission, recordSlaJustification, log,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useData = () => useContext(Ctx);
