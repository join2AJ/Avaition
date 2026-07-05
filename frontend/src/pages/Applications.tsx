import { useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Building2, MapPin, Layers, Filter, X, ChevronRight } from "lucide-react";
import { useAuth } from "@/app/auth";
import { useSettings, visiblePillars } from "@/app/settings";
import { useData } from "@/app/data";
import { entityName } from "@/lib/api";
import { STATUS_META, STATE_ORDER } from "@/domain/status";
import { ZONES } from "@/domain/zones";
import { applyFilter, type AppFilter } from "@/domain/filter";
import { transitionsFor, type Transition } from "@/domain/transitions";
import type { Application, Pillar, Role } from "@/domain/types";
import { Pill, PillarBadge, ZoneChips, ClauseBadge } from "@/components/ui";
import ApplicationRegister from "@/components/ApplicationRegister";
import SlaStepper from "@/components/SlaStepper";

const PASS_TYPES_ALL = ["BAEP", "TAEP", "VAT", "Permanent", "ToT", "VEP", "VAP", "ADP"];

export default function Applications() {
  const { session } = useAuth();
  const { policy } = useSettings();
  const { applications: apps, entities } = useData();
  const { id } = useParams();
  const nav = useNavigate();

  const allowed = visiblePillars(session!.role, policy);
  const scoped = useMemo(() => {
    let list = apps.filter((a) => allowed.includes(a.pillar));
    if (session!.role === "entity" || session!.role === "others") {
      list = list.filter((a) => a.entityId === session!.entityId);
    } else if (session!.role === "individual") {
      list = list.filter((a) => a.subject === session!.name);
    }
    return list;
  }, [apps, session, allowed]);

  const current = id ? apps.find((a) => a.id === id) : null;

  if (current) {
    const outOfScope =
      (session!.role === "individual" && current.subject !== session!.name) ||
      ((session!.role === "entity" || session!.role === "others") && current.entityId !== session!.entityId);
    const blocked = !allowed.includes(current.pillar) || outOfScope;
    const st = STATUS_META[current.status];
    return (
      <div className="page">
        <button className="btn btn-ghost back-btn" onClick={() => nav("/app/applications")}>
          <ArrowLeft size={15} /> Back to register
        </button>
        {blocked ? (
          <div className="card card-pad">This pass pillar is outside your access scope.</div>
        ) : (
          <>
            <div className="page-head">
              <div>
                <h2>{current.id} · {current.subject}</h2>
                <p className="muted app-subline">
                  <PillarBadge pillar={current.pillar} />
                  <span className="mono">{current.passType}</span>
                  <span><Building2 size={13} /> {entityName(current.entityId, entities)}</span>
                  <span><MapPin size={13} /> <ZoneChips codes={current.zones} /></span>
                </p>
              </div>
              <Pill tone={st.tone} dot>{st.label}</Pill>
            </div>
            <div className="detail-grid">
              <SlaStepper app={current} />
              <div className="detail-side-stack">
                <ApplicationActions app={current} role={session!.role} />
                <div className="card card-pad detail-side">
                  <span className="section-title">Governing references</span>
                  <div className="ref-row"><Layers size={14} /> Pillar {current.pillar} · {current.passType}</div>
                  <div className="ref-row"><ClauseBadge>AVSEC Order 02/2022 {current.clauseRef}</ClauseBadge></div>
                  <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 8 }}>
                    Every step above is gated on its clause and SLA. A step cannot clear until its checklist is
                    Uploaded + Verified, and any deficiency routes to the clarification queue before committee.
                  </p>
                </div>
                <StepHistory app={current} />
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return <ApplicationsList scoped={scoped} allowed={allowed} entities={entities} role={session!.role} />;
}

/** Role-gated lifecycle actions that drive a raised pass forward in-app. */
function ApplicationActions({ app, role }: { app: Application; role: Role }) {
  const { advanceApplication } = useData();
  const actions = transitionsFor(app.status, role);
  const [pending, setPending] = useState<Transition | null>(null);
  const [note, setNote] = useState("");

  const commit = (t: Transition) => {
    advanceApplication(app.id, t.to, { note: note.trim() || undefined, action: t.label });
    setPending(null); setNote("");
  };

  if (STATUS_META[app.status] && actions.length === 0) {
    const terminal = ["surrendered", "rejected", "withdrawn"].includes(app.status);
    return (
      <div className="card card-pad detail-side">
        <span className="section-title">Actions</span>
        <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 6 }}>
          {terminal
            ? `This pass is ${STATUS_META[app.status].label.toLowerCase()} — no further action from your role.`
            : "No action available to your role at this stage. It sits with the responsible desk."}
        </p>
      </div>
    );
  }

  return (
    <div className="card card-pad detail-side">
      <span className="section-title">Actions</span>
      <p className="muted" style={{ fontSize: 12, margin: "2px 0 10px" }}>
        Drive this pass through its lifecycle. Every action is logged with your name &amp; time.
      </p>
      {pending ? (
        <div className="action-confirm">
          <label className="field-label">
            {pending.needsNote ? "Reason (mandatory)" : "Note (optional)"}
            {pending.clause && <span className="badge-clause" style={{ marginLeft: 6 }}>{pending.clause}</span>}
          </label>
          <textarea className="field" rows={2} placeholder={pending.needsNote ? "State the reason…" : "Add a note…"} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="action-confirm-row">
            <button className={`btn ${pending.tone === "red" ? "btn-bad" : pending.tone === "ghost" ? "btn-ghost" : "btn-brand"}`}
              disabled={pending.needsNote && !note.trim()} onClick={() => commit(pending)}>
              Confirm · {pending.label}
            </button>
            <button className="btn btn-ghost" onClick={() => { setPending(null); setNote(""); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="action-list">
          {actions.map((t) => (
            <button key={t.to + t.label}
              className={`btn action-btn ${t.tone === "brand" ? "btn-brand" : t.tone === "green" ? "btn-brand" : t.tone === "red" ? "btn-bad" : "btn-ghost"}`}
              onClick={() => (t.needsNote ? (setPending(t), setNote("")) : commit(t))}>
              <span>{t.label}</span>
              {t.clause && <span className="action-clause">{t.clause}</span>}
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Timestamped trail of every step taken on this application. */
function StepHistory({ app }: { app: Application }) {
  const steps = app.stepLog ?? [];
  if (steps.length === 0) return null;
  return (
    <div className="card card-pad detail-side">
      <span className="section-title">Step history</span>
      <ol className="step-history">
        {steps.map((s, i) => (
          <li key={i}>
            <span className="sh-time mono">{s.at}</span>
            <span className="sh-body">
              <b>{s.action ?? s.stage}</b>
              {s.by && <span className="muted"> · {s.by}</span>}
              {(s.note || s.slaNote) && <div className="sh-note">“{s.note ?? s.slaNote}”</div>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ApplicationsList({ scoped, allowed, entities, role }: {
  scoped: import("@/domain/types").Application[];
  allowed: Pillar[]; entities: import("@/domain/types").Entity[]; role: string;
}) {
  // URL is the single source of truth so search, tabs, dashboard links and
  // manual filters all stay consistent and are shareable/bookmarkable.
  const [params, setParams] = useSearchParams();
  const nameOf = (id: string) => entityName(id, entities);

  const pillar = (params.get("pillar") as Pillar | "ALL") || "ALL";
  const filter: AppFilter = {
    zone: params.get("zone") || undefined,
    stage: params.get("stage") || undefined,
    passType: params.get("passType") || undefined,
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
    q: params.get("q") || undefined,
  };
  const patch = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    v ? n.set(k, v) : n.delete(k);
    setParams(n, { replace: true });
  };
  const set = (k: keyof AppFilter, v: string) => patch(k, v);
  const setPillar = (p: Pillar | "ALL") => patch("pillar", p === "ALL" ? "" : p);
  const clear = () => setParams(new URLSearchParams(pillar === "ALL" ? {} : { pillar }), { replace: true });

  const tabs: (Pillar | "ALL")[] = ["ALL", ...(["MAN", "MATERIAL", "VEHICLE"] as Pillar[]).filter((p) => allowed.includes(p))];
  const countFor = (p: Pillar | "ALL") => applyFilter(scoped, { ...filter, pillar: p }, nameOf).length;
  const rows = applyFilter(scoped, { ...filter, pillar }, nameOf);
  const activeCount = Object.values(filter).filter(Boolean).length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Applications</h2>
          <p className="muted">Three pillars · filter by zone, stage, pass type and date. Click any row for its lifecycle &amp; SLA · all timestamps in IST.</p>
        </div>
      </div>

      <div className="app-tabs">
        {tabs.map((t) => (
          <button key={t} className={`app-tab ${pillar === t ? "active" : ""}`} onClick={() => setPillar(t)}>
            {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
            <span className="app-tab-n">{countFor(t)}</span>
          </button>
        ))}
      </div>

      <section className="card card-pad filter-bar">
        <div className="filter-row">
          <span className="filter-lead"><Filter size={14} /> Filters</span>
          <select className="field mini" value={filter.zone || ""} onChange={(e) => set("zone", e.target.value)}>
            <option value="">Any zone</option>
            {ZONES.map((z) => <option key={z.code} value={z.code}>{z.code} · {z.label}</option>)}
          </select>
          <select className="field mini" value={filter.stage || ""} onChange={(e) => set("stage", e.target.value)}>
            <option value="">Any stage</option>
            {STATE_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
          <select className="field mini" value={filter.passType || ""} onChange={(e) => set("passType", e.target.value)}>
            <option value="">Any pass type</option>
            {PASS_TYPES_ALL.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className="filter-date">From <input type="date" className="field mini" value={filter.from || ""} onChange={(e) => set("from", e.target.value)} /></label>
          <label className="filter-date">To <input type="date" className="field mini" value={filter.to || ""} onChange={(e) => set("to", e.target.value)} /></label>
          <input className="field mini grow" placeholder="Search id / name / entity…" value={filter.q || ""} onChange={(e) => set("q", e.target.value)} />
          {activeCount > 0 && <button className="btn btn-ghost mini-btn" onClick={clear}><X size={13} /> Clear</button>}
        </div>
        <div className="filter-result">
          <b>{rows.length}</b> result{rows.length === 1 ? "" : "s"}
          {filter.zone && <span className="chip-f">zone {filter.zone}</span>}
          {filter.stage && <span className="chip-f">{STATUS_META[filter.stage as keyof typeof STATUS_META]?.label}</span>}
          {filter.passType && <span className="chip-f">{filter.passType}</span>}
          {(filter.from || filter.to) && <span className="chip-f">{filter.from || "…"} → {filter.to || "…"}</span>}
        </div>
      </section>

      <section className="card">
        <ApplicationRegister apps={rows} entities={entities} linkBase="/app/applications" showTime />
      </section>
      {role === "bcas" && <p className="muted" style={{ fontSize: 12 }}>BCAS scope: {allowed.join(" · ")} passes.</p>}
    </div>
  );
}
