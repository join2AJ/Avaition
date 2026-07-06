import { useState } from "react";
import { Building2, Users2, Check, Search, History as HistoryIcon, MapPin } from "lucide-react";
import { useAuth } from "@/app/auth";
import { useData } from "@/app/data";
import { entityName } from "@/lib/api";
import { subTabKey } from "@/app/nav";
import { ZONES } from "@/domain/zones";
import { Pill } from "@/components/ui";

const ESC_TONE: Record<string, string> = { blocked: "red", approved: "green", rejected: "slate" };

// BCAS / Admin editor for the zone database — per-entity entitled zones, the
// role → zone-need matrix, and the full history of entitlement changes and
// escalation requests. Edits are audit-logged and feed the auto-give on passes.
export default function ZoneAccess() {
  const { session } = useAuth();
  const { entities, roleZones, audit, zoneEscalations, resolveEscalation, setEntityZones, setRoleZones, isTabHidden } = useData();
  const canResolve = ["admin", "bcas"].includes(session!.role);
  type ZTab = "entity" | "role" | "history";
  const [tab, setTab] = useState<ZTab>("entity");
  const Z_TABS: { key: ZTab; label: string; icon: typeof Building2 }[] = [
    { key: "entity", label: "Entity-wise zones", icon: Building2 },
    { key: "role", label: "Role-wise zones", icon: Users2 },
    { key: "history", label: "History & escalations", icon: HistoryIcon },
  ];
  const visTabs = Z_TABS.filter((t) => !isTabHidden(session!.role, subTabKey("/app/zone-access", t.key)));
  const activeTab = visTabs.some((t) => t.key === tab) ? tab : visTabs[0]?.key;
  const [q, setQ] = useState("");
  const zoneHistory = audit.filter((a) => ["edit_entity_zones", "edit_role_zones", "renew_contract"].includes(a.action));
  const nq = q.trim().toLowerCase();
  const entRows = entities.filter((e) => !nq || e.name.toLowerCase().includes(nq));
  const roleRows = Object.keys(roleZones).filter((r) => !nq || r.toLowerCase().includes(nq));

  const toggleEntity = (id: string, code: string, on: boolean) => {
    const ent = entities.find((e) => e.id === id)!;
    const set = new Set(ent.entitledZones);
    on ? set.add(code) : set.delete(code);
    setEntityZones(id, Array.from(set));
  };
  const toggleRole = (role: string, code: string, on: boolean) => {
    const set = new Set(roleZones[role] ?? []);
    on ? set.add(code) : set.delete(code);
    setRoleZones(role, Array.from(set));
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Zone access database</h2>
          <p className="muted">BCAS &amp; Admin may change zone access for <b>any entity</b> and <b>any role</b>. The History tab holds every entitlement change and all escalation requests — with justification, status and the date &amp; time since when. Changes auto-give zones on new passes and are audit-logged.</p>
        </div>
      </div>

      <div className="za-controls">
        <div className="create-tabs">
          {visTabs.map((t) => (
            <button key={t.key} className={`ctab ${activeTab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}><t.icon size={15} /> {t.label}</button>
          ))}
        </div>
        {activeTab !== "history" && (
          <div className="za-search">
            <Search size={15} className="muted" />
            <input placeholder={`Search ${activeTab === "entity" ? "entities" : "roles"}…`} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        )}
      </div>

      {activeTab !== "history" ? (
        <>
          <section className="card za-card">
            <div className="za-scroll">
              <table className="za-table">
                <thead>
                  <tr><th className="za-name">{activeTab === "entity" ? "Entity" : "Job role"}</th>
                    {ZONES.map((z) => <th key={z.code} className={`mono ${z.sra ? "sra" : ""}`} title={z.label}>{z.code}</th>)}</tr>
                </thead>
                <tbody>
                  {activeTab === "entity"
                    ? entRows.map((e) => (
                        <tr key={e.id}>
                          <td className="za-name">{e.name}</td>
                          {ZONES.map((z) => {
                            const on = e.entitledZones.includes(z.code);
                            return <td key={z.code} className="za-cell" onClick={() => toggleEntity(e.id, z.code, !on)}>
                              <span className={`mx-box ${on ? "on" : ""}`}>{on && <Check size={11} />}</span></td>;
                          })}
                        </tr>
                      ))
                    : roleRows.map((role) => (
                        <tr key={role}>
                          <td className="za-name">{role}</td>
                          {ZONES.map((z) => {
                            const on = (roleZones[role] ?? []).includes(z.code);
                            return <td key={z.code} className="za-cell" onClick={() => toggleRole(role, z.code, !on)}>
                              <span className={`mx-box ${on ? "on" : ""}`}>{on && <Check size={11} />}</span></td>;
                          })}
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </section>
          <p className="muted" style={{ fontSize: 11.5 }}>SRA zones are shown in red. A pass request beyond the entitled/role set is hard-blocked and escalates with a letterhead justification.</p>
        </>
      ) : (
        <>
          <section className="card">
            <div className="card-head card-pad" style={{ paddingBottom: 8 }}>
              <span className="section-title"><MapPin size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} /> Escalated zone requests</span>
              <span className="muted" style={{ fontSize: 12 }}>beyond entitlement · with justification &amp; status</span>
            </div>
            <div className="matrix-scroll">
              <table className="sur-table">
                <thead><tr><th>Ref</th><th>Holder</th><th>Entity</th><th>Requested</th><th>Exceeds</th><th>Justification</th><th>Raised (IST)</th><th>Status</th>{canResolve && <th></th>}</tr></thead>
                <tbody>
                  {zoneEscalations.map((e) => (
                    <tr key={e.id}>
                      <td className="mono">{e.id}{e.appId && <div className="muted mono" style={{ fontSize: 10 }}>{e.appId}</div>}</td>
                      <td><b>{e.subject}</b></td>
                      <td className="muted">{entityName(e.entityId, entities)}</td>
                      <td><span className="zone-chips">{e.requested.map((z) => <span key={z} className={`zone-chip mono ${e.exceeded.includes(z) ? "over" : ""}`}>{z}</span>)}</span></td>
                      <td><span className="zone-chips">{e.exceeded.map((z) => <span key={z} className="zone-chip mono over">{z}</span>)}</span></td>
                      <td className="sur-just">{e.justification}</td>
                      <td className="mono" style={{ fontSize: 11.5 }}>{e.since}</td>
                      <td><Pill tone={ESC_TONE[e.status]} dot>{e.status}</Pill></td>
                      {canResolve && <td>{e.status === "blocked"
                        ? <span className="row-actions"><button className="btn btn-ghost mini-btn" onClick={() => resolveEscalation(e.id, "approved")}>Approve</button><button className="btn btn-ghost mini-btn" onClick={() => resolveEscalation(e.id, "rejected")}>Reject</button></span>
                        : <span className="muted">—</span>}</td>}
                    </tr>
                  ))}
                  {zoneEscalations.length === 0 && <tr><td colSpan={9} className="reg-empty muted">No escalation requests.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <div className="card-head card-pad" style={{ paddingBottom: 8 }}>
              <span className="section-title"><HistoryIcon size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} /> Entitlement change history</span>
              <span className="muted" style={{ fontSize: 12 }}>{zoneHistory.length} changes · since when · who</span>
            </div>
            <div className="register">
              {zoneHistory.map((h, i) => (
                <div className="reg-row" key={i}>
                  <span className="mono reg-id">{h.ts}</span>
                  <span className="reg-subject">{h.object}</span>
                  <span className="muted">{h.detail}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{h.actor}</span>
                </div>
              ))}
              {zoneHistory.length === 0 && <div className="reg-empty muted">No entitlement changes recorded yet — edits here and contract renewals will appear with date &amp; time.</div>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
