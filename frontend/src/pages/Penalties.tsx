import { useEffect, useState } from "react";
import { AlertTriangle, FileText, Gavel } from "lucide-react";
import type { Entity } from "@/domain/types";
import type { Surrender } from "@/lib/demoData";
import { api, entityName } from "@/lib/api";
import { Pill, ClauseBadge } from "@/components/ui";

const REASON_TONE: Record<string, string> = { terminated: "red", expired: "amber", deceased: "slate" };

export default function Penalties() {
  const [surrenders, setSurrenders] = useState<Surrender[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  useEffect(() => { api.listSurrenders().then(setSurrenders); api.listEntities().then(setEntities); }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Surrenders · penalties</h2>
          <p className="muted">Surrender is mandatory within <b>1 week</b> of exit. Late surrender auto-notifies BCAS + entity; BCAS may raise a penalty with written justification · §10.7–10.8.</p>
        </div>
        <Pill tone="red" dot>{surrenders.length} incidents</Pill>
      </div>

      <div className="pen-list">
        {surrenders.map((s) => (
          <section className="card pen-card" key={s.id}>
            <div className={`pen-strip tone-${REASON_TONE[s.reason]}`} />
            <div className="pen-body">
              <div className="pen-top">
                <span className="pen-holder"><AlertTriangle size={15} className="stop-ic" /> {s.holder}</span>
                <span className="mono muted">{s.applicationId}</span>
                <Pill tone={REASON_TONE[s.reason]}>{s.reason}</Pill>
                <span className="pen-late">LATE {s.daysLate}D</span>
              </div>
              <div className="pen-meta">
                <span>{entityName(s.entityId, entities)}</span>
                <span className="muted">exit {s.exitDate} · due {s.dueDate}</span>
              </div>

              <div className="pen-steps">
                <div className={`pen-step ${s.entityJustification ? "done" : "wait"}`}>
                  <FileText size={14} /><div><b>Entity justification</b>
                    <p>{s.entityJustification ?? "Awaiting entity submission (timestamped)…"}</p></div>
                </div>
                <div className={`pen-step ${s.penalty ? "done" : "wait"}`}>
                  <Gavel size={14} /><div><b>BCAS penalty</b>
                    <p>{s.penalty ? `${s.penalty} · ` : "Under BCAS review · "}
                      {s.penaltyStatus && <Pill tone={s.penaltyStatus === "open" ? "amber" : "green"}>{s.penaltyStatus}</Pill>}</p></div>
                </div>
              </div>
              <div className="pen-foot"><ClauseBadge>§10.7 surrender within 1 week</ClauseBadge> <ClauseBadge>§10.8 loss/theft → FIR + Stop List</ClauseBadge></div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
