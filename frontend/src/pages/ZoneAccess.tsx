import { useState } from "react";
import { Building2, Users2, Check } from "lucide-react";
import { useData } from "@/app/data";
import { ZONES } from "@/domain/zones";

// BCAS / Admin editor for the zone database — per-entity entitled zones and
// the role → zone-need matrix. Edits are audit-logged and feed the auto-give
// on pass creation.
export default function ZoneAccess() {
  const { entities, roleZones, setEntityZones, setRoleZones } = useData();
  const [tab, setTab] = useState<"entity" | "role">("entity");

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
          <p className="muted">BCAS &amp; Admin may change zone access for <b>any entity</b> and for <b>any role</b>. Changes auto-give zones on new passes and are audit-logged.</p>
        </div>
      </div>

      <div className="create-tabs">
        <button className={`ctab ${tab === "entity" ? "active" : ""}`} onClick={() => setTab("entity")}><Building2 size={15} /> Entity-wise zones</button>
        <button className={`ctab ${tab === "role" ? "active" : ""}`} onClick={() => setTab("role")}><Users2 size={15} /> Role-wise zones</button>
      </div>

      <section className="card za-card">
        <div className="za-scroll">
          <table className="za-table">
            <thead>
              <tr><th className="za-name">{tab === "entity" ? "Entity" : "Job role"}</th>
                {ZONES.map((z) => <th key={z.code} className={`mono ${z.sra ? "sra" : ""}`} title={z.label}>{z.code}</th>)}</tr>
            </thead>
            <tbody>
              {tab === "entity"
                ? entities.map((e) => (
                    <tr key={e.id}>
                      <td className="za-name">{e.name}</td>
                      {ZONES.map((z) => {
                        const on = e.entitledZones.includes(z.code);
                        return <td key={z.code} className="za-cell" onClick={() => toggleEntity(e.id, z.code, !on)}>
                          <span className={`mx-box ${on ? "on" : ""}`}>{on && <Check size={11} />}</span></td>;
                      })}
                    </tr>
                  ))
                : Object.keys(roleZones).map((role) => (
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
    </div>
  );
}
