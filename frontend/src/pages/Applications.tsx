import { useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Building2, MapPin, Layers, Filter, X } from "lucide-react";
import { useAuth } from "@/app/auth";
import { useSettings, visiblePillars } from "@/app/settings";
import { useData } from "@/app/data";
import { entityName } from "@/lib/api";
import { STATUS_META, STATE_ORDER } from "@/domain/status";
import { ZONES } from "@/domain/zones";
import { applyFilter, type AppFilter } from "@/domain/filter";
import type { Pillar } from "@/domain/types";
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
              <div className="card card-pad detail-side">
                <span className="section-title">Governing references</span>
                <div className="ref-row"><Layers size={14} /> Pillar {current.pillar} · {current.passType}</div>
                <div className="ref-row"><ClauseBadge>AVSEC Order 02/2022 {current.clauseRef}</ClauseBadge></div>
                <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 8 }}>
                  Every step above is gated on its clause and SLA. A step cannot clear until its checklist is
                  Uploaded + Verified, and any deficiency routes to the clarification queue before committee.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return <ApplicationsList scoped={scoped} allowed={allowed} entities={entities} role={session!.role} />;
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
