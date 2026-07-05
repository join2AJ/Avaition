import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Users2, CheckCircle2, ChevronRight, ArrowRight } from "lucide-react";
import type { Application, Entity } from "@/domain/types";
import type { Committee } from "@/lib/demoData";
import { api, entityName } from "@/lib/api";
import { useAuth } from "@/app/auth";
import { useData } from "@/app/data";
import { today } from "@/domain/entitlements";
import { PillarBadge, Pill } from "@/components/ui";

// The committee processing chain — Pass Section verifies, forwards to BCAS for
// scrutiny; BCAS returns to Pass Section or another selected agency; records
// updated; printed; BCAS verifies hard cards; operator distributes; individuals
// cross-sign.
const COMMITTEE_STAGES = [
  "Pass Section verification",
  "Forwarded to BCAS",
  "BCAS committee scrutiny",
  "Returned to agency",
  "Records updated & submitted",
  "Printing",
  "BCAS hard-card verification",
  "Operator distribution + cross-sign",
];

export default function Committees() {
  const { session } = useAuth();
  const { log } = useData();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [propDate, setPropDate] = useState("");
  const [propTime, setPropTime] = useState("10:00");
  const [agency, setAgency] = useState("Pass Section (Aerodrome)");
  const [proposed, setProposed] = useState<string | null>(null);
  const isAdmin = session?.role === "admin";
  const canPropose = ["admin", "operator", "bcas"].includes(session!.role);

  useEffect(() => {
    api.listCommittees().then(setCommittees);
    api.listApplications().then(setApps);
    api.listEntities().then(setEntities);
  }, []);

  const ready = apps.filter((a) => a.status === "committee_scheduled");
  const byId = (id: string) => apps.find((a) => a.id === id);

  const propose = () => {
    if (!propDate) return;
    log("propose_committee", `${propDate} ${propTime}`, `Committee proposed · return agency: ${agency}`);
    setProposed(`Proposed for ${propDate} ${propTime} · returns to ${agency}`);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Committee agenda</h2>
          <p className="muted">AEP Committee meets at least <b>fortnightly</b> · dates may be today or forward only (back-dating blocked) · §8.3.3.</p>
        </div>
        <Pill tone="violet" dot>{ready.length} committee-ready</Pill>
      </div>

      {canPropose && (
        <section className="card card-pad">
          <div className="card-head"><span className="section-title">Propose a committee</span><span className="muted" style={{ fontSize: 12 }}>Proposed by BCAS or Pass Section · today or forward only</span></div>
          <div className="filter-row">
            <label className="filter-date">Date <input type="date" className="field mini" min={isAdmin ? undefined : today()} value={propDate} onChange={(e) => setPropDate(e.target.value)} /></label>
            <label className="filter-date">Time <input type="time" className="field mini" value={propTime} onChange={(e) => setPropTime(e.target.value)} /></label>
            <label className="filter-date">Return to
              <select className="field mini" value={agency} onChange={(e) => setAgency(e.target.value)}>
                <option>Pass Section (Aerodrome)</option><option>Airport Operator</option><option>CISF / ASG</option><option>Other agency (BCAS-selected)</option>
              </select></label>
            <button className="btn btn-brand mini-btn" disabled={!propDate} onClick={propose}>Propose <ArrowRight size={14} /></button>
            {proposed && <span className="pill tone-green pill-dot">{proposed}</span>}
          </div>
        </section>
      )}

      <section className="card card-pad">
        <div className="card-head"><span className="section-title">Committee processing chain</span><span className="muted" style={{ fontSize: 12 }}>§8.3.3 · verification → scrutiny → print → distribution</span></div>
        <div className="chain">
          {COMMITTEE_STAGES.map((s, i) => (
            <span className="chain-node" key={s}>
              <span className="chain-dot">{i + 1}</span><span className="chain-label">{s}</span>
              {i < COMMITTEE_STAGES.length - 1 && <ArrowRight size={13} className="chain-arrow muted" />}
            </span>
          ))}
        </div>
      </section>

      <div className="cmte-grid">
        {committees.map((c) => (
          <section className="card card-pad cmte-card" key={c.id}>
            <div className="cmte-head">
              <span className="cmte-date"><CalendarClock size={16} /> {c.date}</span>
              <span className="mono muted">{c.id}</span>
            </div>
            <div className="cmte-members"><Users2 size={13} /> {c.chair} · <span className="muted">{c.members}</span></div>
            <div className="cmte-agenda">
              <span className="eyebrow">Agenda · auto-pulled</span>
              {c.applicationIds.length === 0 && <p className="muted" style={{ fontSize: 12.5, margin: "6px 0 0" }}>No applications assigned yet.</p>}
              {c.applicationIds.map((id) => {
                const a = byId(id);
                if (!a) return null;
                return (
                  <Link to={`/app/applications/${a.id}`} className="cmte-app" key={id}>
                    <span className="mono">{a.id}</span> <PillarBadge pillar={a.pillar} />
                    <span className="cmte-app-name">{a.subject}</span>
                    <span className="muted">{entityName(a.entityId, entities)}</span>
                    <ChevronRight size={15} className="muted" />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="card">
        <div className="card-head card-pad" style={{ paddingBottom: 8 }}>
          <span className="section-title">Committee-ready pool</span>
          <span className="muted" style={{ fontSize: 12 }}>All items Uploaded + Verified · zone-check passed</span>
        </div>
        <div className="register">
          {ready.map((a) => (
            <Link to={`/app/applications/${a.id}`} key={a.id} className="reg-row cmte-ready-row">
              <span className="mono reg-id">{a.id}</span>
              <PillarBadge pillar={a.pillar} />
              <span className="reg-subject">{a.subject}</span>
              <span className="muted">{entityName(a.entityId, entities)}</span>
              <Pill tone="green"><CheckCircle2 size={12} /> Ready</Pill>
              <ChevronRight size={16} className="muted reg-chev" />
            </Link>
          ))}
          {ready.length === 0 && <div className="reg-empty muted">No committee-ready applications.</div>}
        </div>
      </section>
    </div>
  );
}
