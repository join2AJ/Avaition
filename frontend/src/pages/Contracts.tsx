import { useState } from "react";
import { FileSignature, Plus, Ban, Upload } from "lucide-react";
import { useData } from "@/app/data";
import { Pill, ClauseBadge } from "@/components/ui";

// Contracts are the backbone: every pass is raised under a contract. When a
// contract ends/terminates, its passes cascade to surrender and everyone
// concerned is intimated (§10.3 · §10.7).
export default function Contracts() {
  const { contracts, entities, applications, createContract, terminateContract } = useData();
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ entityId: entities[0]?.id ?? "", counterparty: "", type: "Work Order", start: "", end: "", scope: "", copyFileName: "" });
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));

  const entName = (id: string) => entities.find((e) => e.id === id)?.name ?? id;
  const passCount = (cid: string) => applications.filter((a) => a.contractId === cid && a.status !== "surrendered").length;

  const save = () => {
    if (!f.counterparty || !f.end) return;
    createContract(f);
    setAdding(false);
    setF({ entityId: entities[0]?.id ?? "", counterparty: "", type: "Work Order", start: "", end: "", scope: "", copyFileName: "" });
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Contracts</h2>
          <p className="muted">Every pass is raised under a contract. Ending a contract surrenders its passes and intimates the entity, BCAS and affected individuals · §10.3.</p>
        </div>
        <button className="btn btn-brand" onClick={() => setAdding((a) => !a)}><Plus size={15} /> New contract</button>
      </div>

      {adding && (
        <section className="card card-pad create-form">
          <div className="form-2col">
            <label className="fld"><span className="fld-l req">Entity</span>
              <select className="field" value={f.entityId} onChange={(e) => set("entityId", e.target.value)}>{entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
            <label className="fld"><span className="fld-l req">Contract with (counterparty)</span><input className="field" value={f.counterparty} onChange={(e) => set("counterparty", e.target.value)} placeholder="Airport Operator / airline / company" /></label>
          </div>
          <div className="form-2col">
            <label className="fld"><span className="fld-l">Type</span>
              <select className="field" value={f.type} onChange={(e) => set("type", e.target.value)}>{["LOI", "LOA", "PO", "SO", "Work Order", "Agreement"].map((t) => <option key={t}>{t}</option>)}</select></label>
            <label className="fld"><span className="fld-l">Scope</span><input className="field" value={f.scope} onChange={(e) => set("scope", e.target.value)} placeholder="Functional scope (drives zones)" /></label>
          </div>
          <div className="form-2col">
            <label className="fld"><span className="fld-l">Start</span><input className="field" type="date" value={f.start} onChange={(e) => set("start", e.target.value)} /></label>
            <label className="fld"><span className="fld-l req">Valid till</span><input className="field" type="date" value={f.end} onChange={(e) => set("end", e.target.value)} /></label>
          </div>
          <div className="create-foot">
            <label className="upload-btn"><Upload size={13} /> {f.copyFileName ? f.copyFileName.slice(0, 18) : "Contract copy"}<input type="file" hidden onChange={(e) => set("copyFileName", e.target.files?.[0]?.name ?? "")} /></label>
            <button className="btn btn-brand" disabled={!f.counterparty || !f.end} onClick={save}>Save contract</button>
          </div>
        </section>
      )}

      <section className="card matrix-card">
        <div className="matrix-scroll">
          <table className="sur-table">
            <thead><tr><th>ID</th><th>Entity</th><th>With</th><th>Type</th><th>Scope</th><th>Start</th><th>Till</th><th>Active passes</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td className="mono">{c.id}</td>
                  <td>{entName(c.entityId)}</td>
                  <td><b>{c.counterparty}</b></td>
                  <td className="mono">{c.type}</td>
                  <td className="sur-just">{c.scope}</td>
                  <td className="mono">{c.start || "—"}</td>
                  <td className="mono">{c.end}</td>
                  <td>{passCount(c.id)}</td>
                  <td><Pill tone={c.status === "active" ? "green" : c.status === "terminated" ? "red" : "slate"} dot>{c.status}</Pill></td>
                  <td>
                    {c.status === "active" && (
                      <button className="btn btn-ghost mini-btn" onClick={() => {
                        if (confirm(`Terminate ${c.id} (${c.counterparty})? ${passCount(c.id)} passes will be surrendered and all parties intimated.`)) terminateContract(c.id);
                      }}><Ban size={13} /> Terminate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="muted" style={{ fontSize: 11.5 }}>
        <FileSignature size={13} style={{ verticalAlign: "-2px" }} /> On termination: passes → surrender; individuals still covered by another contract keep access, those whose zones shrink must re-apply. Closing formalities within <b>7 days</b> · <ClauseBadge>§10.7</ClauseBadge>
      </p>
    </div>
  );
}
