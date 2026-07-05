import { AlertTriangle, FileText, Gavel, CheckCircle2 } from "lucide-react";
import { entityName } from "@/lib/api";
import { useAuth } from "@/app/auth";
import { useData } from "@/app/data";
import { today } from "@/domain/entitlements";
import { Pill } from "@/components/ui";

const REASON_TONE: Record<string, string> = { terminated: "red", expired: "amber", deceased: "slate", surrendered: "green", withdrawn: "red" };

// Surrenders & penalties — table based. Late surrender (>1 week of exit,
// §10.7) auto-notifies BCAS + entity; BCAS may raise a penalty with written
// justification (§10.8). Reads the live store so in-app surrenders,
// withdrawals and contract terminations appear here immediately.
export default function Penalties() {
  const { session } = useAuth();
  const { surrenders, entities, recordSurrenderJustification, raiseSurrenderPenalty, resolveSurrenderPenalty } = useData();
  const isBcas = ["bcas", "admin"].includes(session!.role);
  const isEntitySide = ["entity", "others", "operator", "admin"].includes(session!.role);
  // Days late as of today (a record made now sits inside its 7-day window).
  const daysLateNow = (dueDate: string) => Math.max(0, Math.round((+new Date(today()) - +new Date(dueDate)) / 86400000));
  const addJustification = (id: string) => { const t = window.prompt("Entity justification for the late surrender (§10.7):"); if (t && t.trim()) recordSurrenderJustification(id, t.trim()); };
  const raisePenalty = (id: string) => { const t = window.prompt("BCAS penalty + written justification (§10.8):"); if (t && t.trim()) raiseSurrenderPenalty(id, t.trim()); };

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
              {surrenders.map((s) => {
                const late = Math.max(s.daysLate, daysLateNow(s.dueDate));
                return (
                <tr key={s.id}>
                  <td className="mono">{s.id}</td>
                  <td className="mono">{s.applicationId}</td>
                  <td className="sur-holder">{late > 0 && <AlertTriangle size={13} className="stop-ic" />} {s.holder}</td>
                  <td>{entityName(s.entityId, entities)}</td>
                  <td><Pill tone={REASON_TONE[s.reason]}>{s.reason}</Pill></td>
                  <td className="mono">{s.exitDate}</td>
                  <td className="mono">{s.dueDate}</td>
                  <td>{late > 0 ? <span className="pen-late">{late}D</span> : <span className="muted">on time</span>}</td>
                  <td className="sur-just">
                    {s.entityJustification ?? (isEntitySide && late > 0
                      ? <button className="btn btn-ghost mini-btn" onClick={() => addJustification(s.id)}><FileText size={12} /> Add</button>
                      : <span className="muted">{late > 0 ? "awaiting…" : "—"}</span>)}
                  </td>
                  <td className="sur-just">
                    {s.penalty ?? (isBcas && late > 0
                      ? <button className="btn btn-ghost mini-btn" onClick={() => raisePenalty(s.id)}><Gavel size={12} /> Raise</button>
                      : <span className="muted">{late > 0 ? "under review" : "—"}</span>)}
                  </td>
                  <td>
                    {s.penaltyStatus === "open"
                      ? <span className="row-actions"><Pill tone="amber" dot>open</Pill>{isBcas && <button className="btn btn-ghost mini-btn" onClick={() => resolveSurrenderPenalty(s.id)}><CheckCircle2 size={12} /> Resolve</button>}</span>
                      : s.penaltyStatus === "resolved" ? <Pill tone="green" dot>resolved</Pill> : <span className="muted">—</span>}
                  </td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      </section>
      <p className="muted" style={{ fontSize: 11.5 }}>§10.7 surrender within 1 week · §10.8 loss/theft → FIR + Stop List · refusal to return = theft (police report).</p>
    </div>
  );
}
