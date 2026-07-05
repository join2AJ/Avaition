import { useEffect, useState } from "react";
import { ShieldAlert, FileWarning, MapPin } from "lucide-react";
import { ZONES } from "@/domain/zones";
import type { Entity } from "@/domain/types";
import { api } from "@/lib/api";
import { Pill, ClauseBadge } from "@/components/ui";

export default function Zones() {
  const [entities, setEntities] = useState<Entity[]>([]);
  useEffect(() => { api.listEntities().then(setEntities); }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Zones &amp; escalation</h2>
          <p className="muted">Access is <b>need-to-access</b>. A request beyond contract scope or job-role need is hard-blocked until a letterhead justification is filed · §need-to-access.</p>
        </div>
      </div>

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

      <div className="dash-grid">
        <section className="card card-pad">
          <div className="card-head"><span className="section-title">Entity zone entitlements</span><MapPin size={15} className="muted" /></div>
          <div className="entl-list">
            {entities.map((e) => (
              <div className="entl-row" key={e.id}>
                <span className="entl-name">{e.name}</span>
                <span className="zone-chips">
                  {e.entitledZones.map((c) => <span key={c} className="zone-chip mono">{c}</span>)}
                </span>
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 11.5, marginTop: 12 }}>Set at onboarding &amp; re-confirmed at every contract renewal.</p>
        </section>

        <section className="card card-pad escalation-card">
          <div className="card-head"><span className="section-title">Escalated zone requests</span><Pill tone="red" dot>1 blocked</Pill></div>
          <div className="esc-item">
            <div className="esc-top"><ShieldAlert size={16} className="stop-ic" /> <span className="mono">APP-2231 · M. Iyer</span></div>
            <p className="esc-detail">Requested <b className="mono">A D T P Sd</b> — <b>P · Sd exceed job-role need</b> (Baggage Handler). Submission hard-blocked.</p>
            <div className="esc-req">
              <span className="esc-need"><FileWarning size={13} /> Letterhead PDF required</span>
              <span className="esc-need"><FileWarning size={13} /> Typed justification required</span>
            </div>
            <div className="esc-foot"><ClauseBadge>AVSEC 02/2022 · over-authorisation is an audit finding</ClauseBadge> <span className="muted">→ routes to BCAS / committee</span></div>
          </div>
        </section>
      </div>
    </div>
  );
}
