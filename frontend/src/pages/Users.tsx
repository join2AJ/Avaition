import { useState } from "react";
import { Plus, ShieldAlert, Check, Users2, SlidersHorizontal, Eye, EyeOff, Lock, Scale, Landmark, Building2 } from "lucide-react";
import { useAuth } from "@/app/auth";
import { useSettings } from "@/app/settings";
import { useData } from "@/app/data";
import { VERTICALS, type Crud } from "@/domain/permissions";
import { NAV_CATALOG, NAV_BY_ROLE, SUBTABS, subTabKey } from "@/app/nav";
import { CornerDownRight } from "lucide-react";
import { ROLE_LABEL } from "@/domain/roles";
import { PILLARS, type Pillar, type Role } from "@/domain/types";
import { Pill } from "@/components/ui";

const OPS: (keyof Crud)[] = ["c", "r", "u", "d"];
const OP_LABEL: Record<keyof Crud, string> = { c: "C", r: "R", u: "U", d: "D" };
const MATRIX_ROLES: Role[] = ["admin", "bcas", "operator", "cisf", "entity", "others", "individual"];

export default function Users() {
  const { session } = useAuth();
  const { roles, createRole, setPermission, isTabHidden } = useData();
  type UTab = "roles" | "requirements" | "access";
  const [tab, setTab] = useState<UTab>("roles");
  const [newLabel, setNewLabel] = useState("");
  const canCreate = ["admin", "operator", "bcas"].includes(session!.role);
  const canEdit = session!.role === "admin" || session!.role === "bcas";
  const isAdmin = session!.role === "admin";
  const U_TABS: { key: UTab; label: string; icon: typeof Users2 }[] = [
    { key: "roles", label: "Roles & permissions", icon: Users2 },
    { key: "requirements", label: "Requirements basis", icon: Scale },
    ...(isAdmin ? [{ key: "access" as UTab, label: "Access control", icon: SlidersHorizontal }] : []),
  ];
  const visTabs = U_TABS.filter((t) => !isTabHidden(session!.role, subTabKey("/app/users", t.key)));
  const activeTab = visTabs.some((t) => t.key === tab) ? tab : visTabs[0]?.key;

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
        {visTabs.map((t) => (
          <button key={t.key} className={`ctab ${activeTab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}><t.icon size={15} /> {t.label}</button>
        ))}
      </div>

      {activeTab === "roles" && (
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

      {activeTab === "requirements" && <Requirements />}

      {activeTab === "access" && isAdmin && <AccessControl />}
    </div>
  );
}

// Governance basis — which flows are BCAS regulatory-mandatory and which the
// Aerodrome Operator devised for smooth operations (AVSEC 02/2022 is largely
// silent on Material/ToT, so the operator defined that lifecycle).
type Basis = "bcas" | "operator";
const REQUIREMENTS: { flow: string; basis: Basis; clause: string; note: string }[] = [
  { flow: "Entity registration & signatories", basis: "bcas", clause: "§3 · §13A", note: "Category, Security Programme, Security Clearance, min-2/max-5 Authorized Signatories — regulator-defined." },
  { flow: "MAN — AEP / TAEP / Protocol / BAEP", basis: "bcas", clause: "§5–§11", note: "BGC, AVSEC training, committee scrutiny, co-terminus validity, Stop List — all mandated by BCAS." },
  { flow: "VEHICLE — VAP + ADP", basis: "bcas", clause: "§12A · §14", note: "Vehicle documents, Airside Driving Permit first, max 1-year non-transferable pass — regulator-defined." },
  { flow: "MATERIAL — Tools of Trade (ToT)", basis: "operator", clause: "§10.2 · Annexure C", note: "AVSEC 02/2022 only lists tool categories; it does not define a ToT lifecycle. The Aerodrome Operator devised issuance, escort binding and One-Day / One-month / Quarterly validity." },
  { flow: "Stop List screening", basis: "bcas", clause: "§9", note: "Bar list screened before every issuance — a regulatory control." },
  { flow: "Background Check (BGC) & withdrawal", basis: "bcas", clause: "§8.3.3.6 · §11", note: "Police verification and adverse-BGC withdrawal are regulator-owned." },
  { flow: "AVSEC training validity", basis: "bcas", clause: "§13", note: "Annual refresher; lapse suspends access — regulator-defined." },
  { flow: "Surrender window & penalty", basis: "bcas", clause: "§10.7 · §10.8", note: "7-day surrender on exit and BCAS penalty framework are mandated; the operator runs the day-to-day closing." },
  { flow: "Parked (non-use) / Un-park", basis: "operator", clause: "§10.6", note: "60-day non-use suspension is guideline-noted, but the operator operationalises the park / un-park handling." },
  { flow: "Committee cadence & processing chain", basis: "bcas", clause: "§8.3.3", note: "Fortnightly AEP committee and its scrutiny chain are regulator-defined." },
  { flow: "Zone need-to-access principle", basis: "bcas", clause: "need-to-access", note: "The principle is regulatory; the operator maintains the entity/role zone database and escalation handling." },
  { flow: "Processing SLAs (turnaround)", basis: "operator", clause: "§8.3.3.11 + assumed", note: "MAN SLAs are guideline figures; Material/Vehicle turnarounds are operator-assumed standards for smooth operations." },
  { flow: "Surprise checks & 20% annual audit", basis: "bcas", clause: "§15", note: "AEP Checking Committee cadence is regulator-mandated; the operator executes and records it." },
];
const BASIS_META: Record<Basis, { label: string; tone: string; icon: typeof Landmark }> = {
  bcas: { label: "BCAS — regulatory mandatory", tone: "red", icon: Landmark },
  operator: { label: "Aerodrome Operator — devised", tone: "teal", icon: Building2 },
};

function Requirements() {
  const counts = { bcas: REQUIREMENTS.filter((r) => r.basis === "bcas").length, operator: REQUIREMENTS.filter((r) => r.basis === "operator").length };
  return (
    <>
      <div className="req-legend">
        {(["bcas", "operator"] as Basis[]).map((b) => {
          const m = BASIS_META[b];
          return (
            <div className={`req-legend-item tone-${m.tone}`} key={b}>
              <m.icon size={15} /><b>{m.label}</b><span className="req-legend-n">{counts[b]}</span>
            </div>
          );
        })}
      </div>
      <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.6, margin: "0 0 14px" }}>
        What the regulator (BCAS, AVSEC Order 02/2022) mandates versus what the Aerodrome Operator devised for smooth
        operations. Man and Vehicle passes and entity registration are largely regulator-defined; the guidelines say
        little about <b>Material (ToT)</b>, so the operator built that lifecycle.
      </p>
      <section className="card matrix-card">
        <div className="matrix-scroll">
          <table className="sur-table">
            <thead><tr><th>Flow</th><th>Governance basis</th><th>Reference</th><th>Notes</th></tr></thead>
            <tbody>
              {REQUIREMENTS.map((r) => {
                const m = BASIS_META[r.basis];
                return (
                  <tr key={r.flow}>
                    <td><b>{r.flow}</b></td>
                    <td><Pill tone={m.tone} dot>{r.basis === "bcas" ? "BCAS mandatory" : "Operator devised"}</Pill></td>
                    <td><span className="badge-clause">{r.clause}</span></td>
                    <td className="sur-just">{r.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
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
              {NAV_CATALOG.map((item) => {
                const subs = SUBTABS[item.to] ?? [];
                const cell = (role: Role, key: string, label: string) => {
                  if (!inBase(role, item.to)) return <td key={role} className="access-na">—</td>;
                  if (role === "admin") return <td key={role}><span className="vis-cell locked" title="Admin access is always on and cannot be revoked"><Lock size={12} /></span></td>;
                  const hidden = isHidden(role, key);
                  return (
                    <td key={role}>
                      <button className={`vis-cell ${hidden ? "off" : "on"}`} onClick={() => setNavVisible(role, key, hidden)}
                        title={`${hidden ? "Show" : "Hide"} ${label} for ${ROLE_LABEL[role]}`}>
                        {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </td>
                  );
                };
                return (
                  <>
                    <tr key={item.to}>
                      <td className="mx-vert"><item.icon size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />{item.label}</td>
                      {MATRIX_ROLES.map((role) => cell(role, item.to, item.label))}
                    </tr>
                    {subs.map((s) => (
                      <tr key={item.to + s.key} className="access-subrow">
                        <td className="mx-vert sub"><CornerDownRight size={12} className="muted" style={{ verticalAlign: "-2px", marginRight: 6 }} />{s.label}</td>
                        {MATRIX_ROLES.map((role) => cell(role, subTabKey(item.to, s.key), s.label))}
                      </tr>
                    ))}
                  </>
                );
              })}
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
