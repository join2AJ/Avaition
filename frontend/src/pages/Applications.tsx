import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, MapPin, Layers } from "lucide-react";
import { useAuth } from "@/app/auth";
import { useSettings, visiblePillars } from "@/app/settings";
import { useData } from "@/app/data";
import { entityName } from "@/lib/api";
import { STATUS_META } from "@/domain/status";
import { Pill, PillarBadge, ZoneChips, ClauseBadge } from "@/components/ui";
import ApplicationRegister from "@/components/ApplicationRegister";
import SlaStepper from "@/components/SlaStepper";

export default function Applications() {
  const { session } = useAuth();
  const { policy } = useSettings();
  const { applications: apps, entities } = useData();
  const { id } = useParams();
  const nav = useNavigate();

  const allowed = visiblePillars(session!.role, policy);
  const scoped = useMemo(() => {
    let list = apps.filter((a) => allowed.includes(a.pillar));
    if (["entity", "individual", "others"].includes(session!.role)) {
      list = list.filter((a) => a.entityId === session!.entityId);
    }
    return list;
  }, [apps, session, allowed]);

  const current = id ? apps.find((a) => a.id === id) : null;

  if (current) {
    const blocked = !allowed.includes(current.pillar);
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

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Applications</h2>
          <p className="muted">
            {scoped.length} in scope · click any row to open its lifecycle & SLA
            {session!.role === "bcas" && <span> · BCAS scope: {allowed.join(" · ")}</span>}
          </p>
        </div>
      </div>
      <section className="card">
        <ApplicationRegister apps={scoped} entities={entities} linkBase="/app/applications" />
      </section>
    </div>
  );
}
