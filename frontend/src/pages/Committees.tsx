import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Users2, CheckCircle2, ChevronRight } from "lucide-react";
import type { Application, Entity } from "@/domain/types";
import type { Committee } from "@/lib/demoData";
import { api, entityName } from "@/lib/api";
import { PillarBadge, Pill } from "@/components/ui";

export default function Committees() {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);

  useEffect(() => {
    api.listCommittees().then(setCommittees);
    api.listApplications().then(setApps);
    api.listEntities().then(setEntities);
  }, []);

  const ready = apps.filter((a) => a.status === "committee_scheduled");
  const byId = (id: string) => apps.find((a) => a.id === id);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Committee agenda</h2>
          <p className="muted">AEP Committee meets at least <b>fortnightly</b> · dates may be today or forward only (back-dating blocked) · §8.3.3.</p>
        </div>
        <Pill tone="violet" dot>{ready.length} committee-ready</Pill>
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
