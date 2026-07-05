import { useState } from "react";
import { Building2, User, Wrench, Truck, FileCheck2 } from "lucide-react";
import { CHECKLISTS } from "@/domain/checklists";
import { ClauseBadge } from "@/components/ui";

const ICON = { entity: Building2, individual: User, material: Wrench, vehicle: Truck };

// Reference page — what an entity / individual must obtain for each pass
// (MAN / MATERIAL / VEHICLE ADP+VAP), straight from AVSEC 02/2022 §4.
export default function Checklist() {
  const [scope, setScope] = useState<string>("entity");
  const group = CHECKLISTS.find((g) => g.scope === scope)!;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Checklists</h2>
          <p className="muted">What you need to obtain any pass — MAN, MATERIAL and VEHICLE (ADP/VAP) — for entities and individuals. Every document must be signed &amp; stamped by the Authorized Signatory · §4.</p>
        </div>
      </div>

      <div className="create-tabs">
        {CHECKLISTS.map((g) => {
          const Icon = ICON[g.scope];
          return (
            <button key={g.scope} className={`ctab ${scope === g.scope ? "active" : ""}`} onClick={() => setScope(g.scope)}>
              <Icon size={15} /> {g.scope === "entity" ? "Entity" : g.scope === "individual" ? "Individual (MAN)" : g.scope === "material" ? "Material (ToT)" : "Vehicle (VEP/ADP)"}
            </button>
          );
        })}
      </div>

      <section className="card">
        <div className="card-head card-pad" style={{ paddingBottom: 8 }}>
          <span className="section-title"><FileCheck2 size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} /> {group.title}</span>
          {scope === "individual" && <span className="muted" style={{ fontSize: 12 }}>T = TAEP · B = BAEP (adds BGC + AVSEC + C&amp;A)</span>}
        </div>
        <div className="chk-list">
          {group.items.map((it, i) => (
            <div className="chk-item" key={i}>
              <span className="chk-n mono">{String(i + 1).padStart(2, "0")}</span>
              <div className="chk-body">
                <div className="chk-name">{it.name}
                  {scope === "individual" && (
                    <span className="chk-tags">
                      {it.taep && <span className="chk-tag t">TAEP</span>}
                      {it.baep && <span className="chk-tag b">BAEP</span>}
                    </span>
                  )}
                </div>
                {it.note && <div className="chk-note">{it.note}</div>}
              </div>
              {it.clause && <ClauseBadge>{it.clause}</ClauseBadge>}
            </div>
          ))}
        </div>
      </section>
      <p className="muted" style={{ fontSize: 11.5 }}>Missing documents are the single biggest cause of delays. Pass Section returns any file failing §4D scrutiny (name mismatch, unsigned, photocopy, expired AVSEC, wrong zones).</p>
    </div>
  );
}
