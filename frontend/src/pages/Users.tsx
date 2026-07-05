import { Check, Minus } from "lucide-react";

// Admin role builder — the baseline C/R/U/D matrix per vertical × role from
// AVSEC 02/2022 §2. Admin may additionally mint custom logins with any
// combination; every grant stores its governing policy reference.
const VERTICALS = ["Entities", "Individuals", "Committees", "Zones", "Documents", "Reports", "Penalties"];
const ROLES = ["Admin", "BCAS", "Pass Section", "Entity", "Others"];

// [C,R,U,D] per role per vertical
const MATRIX: Record<string, Record<string, [boolean, boolean, boolean, boolean]>> = {
  Entities:    { Admin: [1,1,1,1], BCAS: [0,1,1,0], "Pass Section": [1,1,1,0], Entity: [0,1,0,0], Others: [0,0,0,0] } as any,
  Individuals: { Admin: [1,1,1,1], BCAS: [0,1,0,0], "Pass Section": [1,1,1,0], Entity: [1,1,0,0], Others: [1,1,0,0] } as any,
  Committees:  { Admin: [1,1,1,1], BCAS: [0,1,0,0], "Pass Section": [1,1,1,0], Entity: [0,1,0,0], Others: [0,1,0,0] } as any,
  Zones:       { Admin: [1,1,1,1], BCAS: [0,1,1,0], "Pass Section": [1,1,0,0], Entity: [1,1,0,0], Others: [1,1,0,0] } as any,
  Documents:   { Admin: [1,1,1,1], BCAS: [0,1,0,0], "Pass Section": [1,1,1,0], Entity: [1,1,0,0], Others: [1,1,0,0] } as any,
  Reports:     { Admin: [1,1,0,0], BCAS: [1,1,0,0], "Pass Section": [1,1,0,0], Entity: [0,1,0,0], Others: [0,0,0,0] } as any,
  Penalties:   { Admin: [1,1,1,0], BCAS: [1,1,1,0], "Pass Section": [0,1,0,0], Entity: [0,1,0,0], Others: [0,1,0,0] } as any,
};
const OPS = ["C", "R", "U", "D"];

export default function Users() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Users &amp; roles</h2>
          <p className="muted">Per-vertical C / R / U / D matrix. Admin can mint custom logins with any combination — every grant stores a governing policy reference · §2 · §3.12.</p>
        </div>
      </div>

      <section className="card matrix-card">
        <div className="matrix-scroll">
          <table className="perm-matrix">
            <thead>
              <tr><th className="mx-vert">Vertical</th>{ROLES.map((r) => <th key={r}>{r}</th>)}</tr>
            </thead>
            <tbody>
              {VERTICALS.map((v) => (
                <tr key={v}>
                  <td className="mx-vert">{v}</td>
                  {ROLES.map((r) => {
                    const crud = MATRIX[v][r];
                    return (
                      <td key={r}>
                        <span className="crud">
                          {OPS.map((op, i) => (
                            <span key={op} className={`crud-cell ${crud[i] ? "on" : ""}`} title={op}>
                              {crud[i] ? <Check size={11} /> : <Minus size={10} />}<b>{op}</b>
                            </span>
                          ))}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="muted" style={{ fontSize: 12 }}>Delete on Individuals = archive only; history retained for audit. Penalties are BCAS-created only. Zone override is BCAS-only.</p>
    </div>
  );
}
