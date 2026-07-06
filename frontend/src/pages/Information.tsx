import { useState } from "react";
import { ListChecks, Map } from "lucide-react";
import { ZONES } from "@/domain/zones";
import { ClauseBadge } from "@/components/ui";
import Checklist from "./Checklist";

// Reference & guidance hub. Holds the document Checklists and the airport
// Zone map + need-to-access policy. Entity zone entitlements and escalation
// requests live in the Zone access database (with full history).
export default function Information() {
  const [tab, setTab] = useState<"checklist" | "zones">("checklist");

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Information</h2>
          <p className="muted">Reference &amp; guidance — what documents each pass needs, and the airport zone map with the need-to-access policy.</p>
        </div>
      </div>

      <div className="create-tabs">
        <button className={`ctab ${tab === "checklist" ? "active" : ""}`} onClick={() => setTab("checklist")}><ListChecks size={15} /> Checklists</button>
        <button className={`ctab ${tab === "zones" ? "active" : ""}`} onClick={() => setTab("zones")}><Map size={15} /> Zones &amp; escalation</button>
      </div>

      {tab === "checklist" && <Checklist embedded />}

      {tab === "zones" && (
        <>
          <section className="card card-pad">
            <div className="card-head"><span className="section-title">Airport zone map</span><span className="muted" style={{ fontSize: 12 }}>SRA = Security Restricted Area</span></div>
            <div className="zone-map">
              {ZONES.map((z) => (
                <div className={`zone-tile ${z.sra ? "sra" : ""}`} key={z.code}>
                  <span className="zone-code mono">{z.code}</span>
                  <span className="zone-name">{z.label}</span>
                  {z.sra && <span className="zone-sra">SRA</span>}
                </div>
              ))}
            </div>
          </section>

          <section className="card card-pad">
            <div className="card-head"><span className="section-title">Need-to-access &amp; escalation policy</span><ClauseBadge>need-to-access</ClauseBadge></div>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.7, marginTop: 6 }}>
              Access is granted strictly on <b>need-to-access</b>. A pass may request only zones its sponsoring entity is
              entitled to <i>and</i> the job role functionally needs. A request beyond that set is <b>hard-blocked</b> at
              creation and must be escalated with a letterhead PDF and a typed justification, routed to BCAS / committee —
              over-authorisation is an audit finding. Live entity entitlements, escalation requests and their full history
              are maintained in the <b>Zone access database</b>.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
