import { useState } from "react";
import { Ban, Plus, Trash2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/app/auth";
import { useData } from "@/app/data";

// The Stop List — persons barred from AEP/TAEP. Screened before EVERY issuance
// (§9). Maintained by BCAS RO + Airport Operator; circulated to all stakeholders.
export default function StopList() {
  const { session } = useAuth();
  const { stopList, addStopList, removeStopList } = useData();
  const canEdit = ["admin", "bcas", "operator"].includes(session!.role);
  const [f, setF] = useState({ name: "", reason: "", source: "BCAS RO" });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Stop List</h2>
          <p className="muted">Persons barred from AEP/TAEP — cross-checked before <b>every</b> issuance. A match hard-blocks the application · §9.</p>
        </div>
        <span className="pill tone-red pill-dot">{stopList.length} barred</span>
      </div>

      {canEdit && (
        <section className="card card-pad create-form">
          <div className="form-2col">
            <label className="fld"><span className="fld-l req">Name</span><input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Full name (as on documents)" /></label>
            <label className="fld"><span className="fld-l">Source</span>
              <select className="field" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>
                <option>BCAS RO</option><option>Airport Operator</option><option>Law Enforcement Agency</option><option>Appropriate Authority</option>
              </select></label>
          </div>
          <label className="fld"><span className="fld-l req">Reason</span><input className="field" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Reason for the bar" /></label>
          <div className="create-foot">
            <span className="muted" style={{ fontSize: 12 }}><ShieldAlert size={13} style={{ verticalAlign: "-2px" }} /> Adding a name blocks all future applications for that person until removed.</span>
            <button className="btn btn-bad" disabled={!f.name.trim() || !f.reason.trim()} onClick={() => { addStopList({ ...f, since: new Date().toISOString().slice(0, 10) }); setF({ name: "", reason: "", source: "BCAS RO" }); }}>
              <Plus size={15} /> Add to Stop List
            </button>
          </div>
        </section>
      )}

      <section className="card matrix-card">
        <div className="matrix-scroll">
          <table className="sur-table">
            <thead><tr><th></th><th>Name</th><th>Reason</th><th>Source</th><th>Since</th>{canEdit && <th></th>}</tr></thead>
            <tbody>
              {stopList.map((s) => (
                <tr key={s.name}>
                  <td><Ban size={15} className="stop-ic" /></td>
                  <td><b>{s.name}</b></td>
                  <td className="sur-just">{s.reason}</td>
                  <td>{s.source}</td>
                  <td className="mono">{s.since}</td>
                  {canEdit && <td><button className="icon-btn" onClick={() => removeStopList(s.name)}><Trash2 size={15} /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
