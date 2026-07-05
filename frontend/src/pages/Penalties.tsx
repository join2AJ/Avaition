import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { Entity } from "@/domain/types";
import type { Surrender } from "@/lib/demoData";
import { api, entityName } from "@/lib/api";
import { Pill } from "@/components/ui";

const REASON_TONE: Record<string, string> = { terminated: "red", expired: "amber", deceased: "slate" };

// Surrenders & penalties — table based. Late surrender (>1 week of exit,
// §10.7) auto-notifies BCAS + entity; BCAS may raise a penalty with written
// justification (§10.8).
export default function Penalties() {
  const [surrenders, setSurrenders] = useState<Surrender[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  useEffect(() => { api.listSurrenders().then(setSurrenders); api.listEntities().then(setEntities); }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Surrenders &amp; penalties</h2>
          <p className="muted">Surrender is mandatory within <b>1 week</b> of exit (§10.7). Late surrender auto-notifies BCAS + entity; BCAS raises a penalty with written justification (§10.8).</p>
        </div>
        <Pill tone="red" dot>{surrenders.length} incidents</Pill>
      </div>

      <section className="card matrix-card">
        <div className="matrix-scroll">
          <table className="sur-table">
            <thead>
              <tr>
                <th>Ref</th><th>Pass</th><th>Holder</th><th>Entity</th><th>Reason</th>
                <th>Exit</th><th>Due</th><th>Late</th><th>Entity justification</th><th>BCAS penalty</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {surrenders.map((s) => (
                <tr key={s.id}>
                  <td className="mono">{s.id}</td>
                  <td className="mono">{s.applicationId}</td>
                  <td className="sur-holder"><AlertTriangle size={13} className="stop-ic" /> {s.holder}</td>
                  <td>{entityName(s.entityId, entities)}</td>
                  <td><Pill tone={REASON_TONE[s.reason]}>{s.reason}</Pill></td>
                  <td className="mono">{s.exitDate}</td>
                  <td className="mono">{s.dueDate}</td>
                  <td><span className="pen-late">{s.daysLate}D</span></td>
                  <td className="sur-just">{s.entityJustification ?? <span className="muted">awaiting…</span>}</td>
                  <td className="sur-just">{s.penalty ?? <span className="muted">under review</span>}</td>
                  <td>{s.penaltyStatus ? <Pill tone={s.penaltyStatus === "open" ? "amber" : "green"} dot>{s.penaltyStatus}</Pill> : <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="muted" style={{ fontSize: 11.5 }}>§10.7 surrender within 1 week · §10.8 loss/theft → FIR + Stop List · refusal to return = theft (police report).</p>
    </div>
  );
}
