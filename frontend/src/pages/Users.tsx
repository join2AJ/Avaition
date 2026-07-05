import { useState } from "react";
import { Plus, ShieldAlert, Check } from "lucide-react";
import { useAuth } from "@/app/auth";
import { useData } from "@/app/data";
import { VERTICALS, type Crud } from "@/domain/permissions";

const OPS: (keyof Crud)[] = ["c", "r", "u", "d"];
const OP_LABEL: Record<keyof Crud, string> = { c: "C", r: "R", u: "U", d: "D" };

// Admin (either kind), Pass Section Operator and BCAS may create roles. Admin
// edits ANY role's per-vertical CRUD. A custom role with no access yet is
// flagged for BCAS to assign.
export default function Users() {
  const { session } = useAuth();
  const { roles, createRole, setPermission } = useData();
  const [newLabel, setNewLabel] = useState("");
  const canCreate = ["admin", "operator", "bcas"].includes(session!.role);
  const canEdit = session!.role === "admin" || session!.role === "bcas";

  const unassigned = roles.filter((r) => r.custom && !r.assigned);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Users &amp; roles</h2>
          <p className="muted">Per-vertical C / R / U / D matrix · §2 · §3.12. {canEdit ? "Click a cell to grant/revoke." : "Read-only for your role."} Every change is audit-logged.</p>
        </div>
      </div>

      {unassigned.length > 0 && (
        <div className="card card-pad flag-banner">
          <ShieldAlert size={18} className="stop-ic" />
          <div>
            <b>{unassigned.length} role{unassigned.length > 1 ? "s" : ""} awaiting BCAS access assignment:</b>{" "}
            {unassigned.map((r) => r.label).join(", ")}. Until access is granted, these roles have no permissions.
          </div>
        </div>
      )}

      {canCreate && (
        <div className="card card-pad create-role-row">
          <span className="fld-l">Create a new role</span>
          <div className="crr-form">
            <input className="field" placeholder="Role name (e.g. Cargo Verifier)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
            <button className="btn btn-brand" disabled={!newLabel.trim()} onClick={() => { createRole(newLabel.trim()); setNewLabel(""); }}>
              <Plus size={15} /> Create role
            </button>
          </div>
          <p className="muted" style={{ fontSize: 11.5, margin: "6px 0 0" }}>New roles start with no access and are flagged to BCAS for assignment.</p>
        </div>
      )}

      <section className="card matrix-card">
        <div className="matrix-scroll">
          <table className="perm-matrix">
            <thead>
              <tr><th className="mx-vert">Role</th>{VERTICALS.map((v) => <th key={v}>{v}</th>)}</tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.key}>
                  <td className="mx-vert">
                    {role.label}
                    {role.custom && !role.assigned && <span className="role-flag">unassigned</span>}
                    {role.custom && role.assigned && <span className="role-custom">custom</span>}
                  </td>
                  {VERTICALS.map((v) => (
                    <td key={v}>
                      <span className="crud">
                        {OPS.map((op) => {
                          const on = role.perms[v][op];
                          return (
                            <button key={op} className={`crud-cell ${on ? "on" : ""} ${canEdit ? "editable" : ""}`}
                              disabled={!canEdit}
                              onClick={() => setPermission(role.key, v, op, !on)} title={`${v} · ${OP_LABEL[op]}`}>
                              {on ? <Check size={11} /> : null}<b>{OP_LABEL[op]}</b>
                            </button>
                          );
                        })}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="muted" style={{ fontSize: 12 }}>Delete on Individuals = archive only (history retained). Penalties are BCAS-created. Zone override is BCAS-only.</p>
    </div>
  );
}
