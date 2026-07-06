import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Users2, CheckCircle2, ChevronRight, ArrowRight } from "lucide-react";
import type { Committee } from "@/lib/demoData";
import { api, entityName } from "@/lib/api";
import { useAuth } from "@/app/auth";
import { useData } from "@/app/data";
import { today } from "@/domain/entitlements";
import { PillarBadge, Pill } from "@/components/ui";

// The committee processing chain (§8.3.3) — one card per step, each explaining
// who owns it and what actually happens, so a first-timer can follow the file
// from Pass Section all the way to the holder's hand.
const COMMITTEE_STAGES = [
  { n: 1, title: "Pass Section verification", owner: "Pass Section", what: "Checklist + Stop List cleared; the file is built and confirmed complete.", clause: "§8.3.2" },
  { n: 2, title: "Forwarded to BCAS", owner: "Airport Operator", what: "Operator scrutinises and forwards the committee-ready file to RD BCAS with a recommendation.", clause: "§8.3.3" },
  { n: 3, title: "BCAS committee scrutiny", owner: "RD BCAS + CASO/ASG + Airport Director", what: "The AEP Committee reviews the file (fortnightly) and decides — approve or return.", clause: "§8.3.3" },
  { n: 4, title: "Returned to agency", owner: "RD BCAS", what: "Decision returns to the Pass Section or another BCAS-selected agency for action.", clause: "§8.3.3" },
  { n: 5, title: "Records updated & submitted", owner: "Pass Section", what: "Approved particulars are recorded and the print request is submitted.", clause: "§8.3.3" },
  { n: 6, title: "Printing", owner: "Airport Operator", what: "The biometric card is printed against the approved record.", clause: "§15" },
  { n: 7, title: "BCAS hard-card verification", owner: "RD BCAS", what: "The printed hard card is verified against the file before release.", clause: "§15" },
  { n: 8, title: "Operator distribution + cross-sign", owner: "Airport Director", what: "Custodian issues the card; the holder signs for it and each shift is logged.", clause: "§15" },
];

export default function Committees() {
  const { session } = useAuth();
  const { log, applications: apps, entities } = useData();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [propDate, setPropDate] = useState("");
  const [propTime, setPropTime] = useState("10:00");
  const [agency, setAgency] = useState("Pass Section (Aerodrome)");
  const [proposed, setProposed] = useState<string | null>(null);
  const isAdmin = session?.role === "admin";
  const canPropose = ["admin", "operator", "bcas"].includes(session!.role);

  useEffect(() => { api.listCommittees().then(setCommittees); }, []);

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

      <section className="cmte-chain-head">
        <div className="card-head" style={{ marginBottom: 4 }}>
          <span className="section-title">Committee processing chain</span>
          <span className="muted" style={{ fontSize: 12 }}>§8.3.3 · verification → scrutiny → print → distribution</span>
        </div>
      </section>
      <div className="chain-cards stagger">
        {COMMITTEE_STAGES.map((s) => (
          <div className="chain-card" key={s.n}>
            <div className="chain-card-top">
              <span className="chain-card-n">{String(s.n).padStart(2, "0")}</span>
              <span className="badge-clause">{s.clause}</span>
            </div>
            <div className="chain-card-title">{s.title}</div>
            <div className="chain-card-what">{s.what}</div>
            <div className="chain-card-owner"><Users2 size={12} /> {s.owner}</div>
          </div>
        ))}
      </div>

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
