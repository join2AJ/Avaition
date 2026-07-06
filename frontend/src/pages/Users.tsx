import { useState } from "react";
import { Plus, ShieldAlert, Check, Users2, SlidersHorizontal, Eye, EyeOff, Lock } from "lucide-react";
import { useAuth } from "@/app/auth";
import { useSettings } from "@/app/settings";
import { useData } from "@/app/data";
import { VERTICALS, type Crud } from "@/domain/permissions";
import { NAV_CATALOG, NAV_BY_ROLE } from "@/app/nav";
import { ROLE_LABEL } from "@/domain/roles";
import { PILLARS, type Pillar, type Role } from "@/domain/types";

const OPS: (keyof Crud)[] = ["c", "r", "u", "d"];
const OP_LABEL: Record<keyof Crud, string> = { c: "C", r: "R", u: "U", d: "D" };
const MATRIX_ROLES: Role[] = ["admin", "bcas", "operator", "cisf", "entity", "others", "individual"];

export default function Users() {
  const { session } = useAuth();
  const { roles, createRole, setPermission } = useData();
  const [tab, setTab] = useState<"roles" | "access">("roles");
  const [newLabel, setNewLabel] = useState("");
  const canCreate = ["admin", "operator", "bcas"].includes(session!.role);
  const canEdit = session!.role === "admin" || session!.role === "bcas";
  const isAdmin = session!.role === "admin";

  const unassigned = roles.filter((r) => r.custom && !r.assigned);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Users &amp; roles</h2>
          <p className="muted">Per-vertical C / R / U / D permissions and — for Admin — access control over what each login can see. Every change is audit-logged.</p>
        </div>
      </div>

      <div className="create-tabs">
        <button className={`ctab ${tab === "roles" ? "active" : ""}`} onClick={() => setTab("roles")}><Users2 size={15} /> Roles &amp; permissions</button>
        {isAdmin && <button className={`ctab ${tab === "access" ? "active" : ""}`} onClick={() => setTab("access")}><SlidersHorizontal size={15} /> Access control</button>}
      </div>

      {tab === "roles" && (
        <>
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
        </>
      )}

      {tab === "access" && isAdmin && <AccessControl />}
    </div>
  );
}

/** Admin access control: per-login visibility of every tab, plus BCAS pillar scope. */
function AccessControl() {
  const { navHidden, setNavVisible } = useData();
  const { policy, setBcasPillar } = useSettings();
  const isHidden = (role: Role, to: string) => (navHidden[role] ?? []).includes(to);
  const inBase = (role: Role, to: string) => (NAV_BY_ROLE[role] ?? []).some((i) => i.to === to);

  return (
    <>
      <section className="card matrix-card">
        <div className="card-head card-pad" style={{ paddingBottom: 8 }}>
          <span className="section-title"><SlidersHorizontal size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} /> Tab visibility per login</span>
          <span className="muted" style={{ fontSize: 12 }}>Click to show / hide. Hidden tabs are unreachable, not just invisible.</span>
        </div>
        <div className="matrix-scroll">
          <table className="perm-matrix access-matrix">
            <thead>
              <tr><th className="mx-vert">Tab</th>{MATRIX_ROLES.map((r) => <th key={r}>{ROLE_LABEL[r]}</th>)}</tr>
            </thead>
            <tbody>
              {NAV_CATALOG.map((item) => (
                <tr key={item.to}>
                  <td className="mx-vert"><item.icon size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />{item.label}</td>
                  {MATRIX_ROLES.map((role) => {
                    if (!inBase(role, item.to)) return <td key={role} className="access-na">—</td>;
                    if (role === "admin") return (
                      <td key={role}>
                        <span className="vis-cell locked" title="Admin access is always on and cannot be revoked"><Lock size={12} /></span>
                      </td>
                    );
                    const hidden = isHidden(role, item.to);
                    return (
                      <td key={role}>
                        <button className={`vis-cell ${hidden ? "off" : "on"}`} onClick={() => setNavVisible(role, item.to, hidden)}
                          title={`${hidden ? "Show" : "Hide"} ${item.label} for ${ROLE_LABEL[role]}`}>
                          {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 11.5, padding: "0 16px 14px" }}>“—” means the tab is not part of that login’s role. <Lock size={11} style={{ verticalAlign: "-1px" }} /> Admin access is always on and cannot be revoked. Changes apply instantly to the sidebar and the route guard.</p>
      </section>

      <section className="card card-pad access-card">
        <div className="card-head">
          <div>
            <span className="section-title">BCAS — visible pass pillars</span>
            <p className="muted" style={{ fontSize: 12.5, margin: "3px 0 0" }}>
              BCAS is interested in <b>Man</b> and <b>Vehicle</b> passes. Toggle <b>Material</b> on only if oversight of ToT cards is required.
            </p>
          </div>
        </div>
        <div className="access-grid">
          {PILLARS.map((p) => {
            const on = policy.bcasPillars.includes(p.key as Pillar);
            return (
              <label key={p.key} className={`access-tile ${on ? "on" : ""}`}>
                <div className="access-tile-head">
                  <span className={`pill tone-${p.key === "MAN" ? "blue" : p.key === "MATERIAL" ? "amber" : "teal"}`}>{p.roman} · {p.label}</span>
                  <span className={`toggle ${on ? "on" : ""}`} onClick={() => setBcasPillar(p.key as Pillar, !on)} role="switch" aria-checked={on}>
                    <span className="toggle-knob" />
                  </span>
                </div>
                <div className="access-pass mono">{p.pass}</div>
                <div className="muted access-note">{on ? "Visible to BCAS" : "Hidden from BCAS"}</div>
              </label>
            );
          })}
        </div>
      </section>
    </>
  );
}
