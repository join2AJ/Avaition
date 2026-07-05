import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useData } from "@/app/data";
import { CENTRAL_NORMS, DIRECTION_LABEL, type Direction } from "@/domain/validity";
import { ClauseBadge } from "@/components/ui";

interface LocalCfg { localDays: number; direction?: Direction; bcasExempt: boolean; }
const load = (): Record<string, LocalCfg> => {
  try { return JSON.parse(sessionStorage.getItem("aep-validity") || "{}"); } catch { return {}; }
};

// Central + local validity matrix. Local norm can only decrease validity;
// BCAS exemption (on request + justification) lifts the local cap for printing.
export default function ValidityMatrix() {
  const { log } = useData();
  const [cfg, setCfg] = useState<Record<string, LocalCfg>>(load);
  const patch = (pt: string, p: Partial<LocalCfg>, central: number) => {
    setCfg((c) => {
      const cur = c[pt] ?? { localDays: central, bcasExempt: false };
      const next = { ...cur, ...p };
      const merged = { ...c, [pt]: next };
      sessionStorage.setItem("aep-validity", JSON.stringify(merged));
      return merged;
    });
    if (p.bcasExempt !== undefined) log("bcas_validity_exemption", pt, p.bcasExempt ? "Exemption granted — printing permitted" : "Exemption revoked", "warn");
    else log("edit_local_validity", pt, `Local norm ${JSON.stringify(p)}`);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Validity matrix</h2>
          <p className="muted">Validity is driven by a <b>central</b> regulatory norm and a <b>local</b> norm — the local norm can only <b>decrease</b> validity. BCAS may grant an exemption (on request + justification) to permit printing.</p>
        </div>
        <span className="pill tone-slate"><ShieldCheck size={13} /> Central + local</span>
      </div>

      <section className="card matrix-card">
        <div className="matrix-scroll">
          <table className="sur-table val-table">
            <thead>
              <tr><th>Pass</th><th>Family</th><th>Central norm</th><th>Local norm (≤ central)</th><th>Authority</th><th>Direction</th><th>BCAS exemption</th></tr>
            </thead>
            <tbody>
              {CENTRAL_NORMS.map((n) => {
                const c = cfg[n.passType] ?? { localDays: n.centralDays, bcasExempt: false };
                const cap = c.bcasExempt ? Infinity : n.centralDays;
                return (
                  <tr key={n.passType}>
                    <td><b>{n.passType}</b></td>
                    <td><span className={`pill tone-${n.family === "MAN" ? "blue" : n.family === "MATERIAL" ? "amber" : "teal"}`}>{n.family}</span></td>
                    <td className="mono">{n.centralLabel} <span className="muted">({n.centralDays}d)</span></td>
                    <td>
                      <input className="field mini" type="number" min={1} max={n.centralDays} value={c.localDays}
                        onChange={(e) => { let v = +e.target.value; if (!c.bcasExempt) v = Math.min(v, cap); patch(n.passType, { localDays: v }, n.centralDays); }} />
                      <span className="muted mono" style={{ marginLeft: 6 }}>days</span>
                    </td>
                    <td className="muted">{n.authority}</td>
                    <td>
                      {n.hasDirection ? (
                        <select className="field mini" value={c.direction || "both"} onChange={(e) => patch(n.passType, { direction: e.target.value as Direction }, n.centralDays)}>
                          {(["entry", "exit", "both"] as Direction[]).map((d) => <option key={d} value={d}>{DIRECTION_LABEL[d]}</option>)}
                        </select>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td>
                      <span className={`toggle ${c.bcasExempt ? "on" : ""}`} role="switch" aria-checked={c.bcasExempt}
                        onClick={() => patch(n.passType, { bcasExempt: !c.bcasExempt }, n.centralDays)}><span className="toggle-knob" /></span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <p className="muted" style={{ fontSize: 11.5 }}>
        <ClauseBadge>§7 · §8.2.2.4</ClauseBadge> Under no circumstance shall issuance be withheld for reasons other than security. Material passes carry a direction: Entry only / Exit only / Entry-Exit. Material can only enter a zone the escorting AEP holder is entitled to.
      </p>
    </div>
  );
}
