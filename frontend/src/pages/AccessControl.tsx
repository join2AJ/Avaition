import { ShieldCheck } from "lucide-react";
import { useSettings } from "@/app/settings";
import { PILLARS } from "@/domain/types";
import type { Pillar } from "@/domain/types";

// Admin-only. Controls which pass pillars BCAS oversight may view. Default is
// MAN + VEHICLE; MATERIAL (ToT) stays hidden from BCAS until enabled here.
export default function AccessControl() {
  const { policy, setBcasPillar } = useSettings();

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Access control</h2>
          <p className="muted">Configure regulator visibility across the three pillars. Applies immediately to BCAS sessions.</p>
        </div>
        <span className="pill tone-slate"><ShieldCheck size={13} /> Admin only</span>
      </div>

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

      <section className="card card-pad">
        <span className="section-title">CISF — verification scope</span>
        <p className="muted" style={{ fontSize: 12.5, margin: "6px 0 0", lineHeight: 1.6 }}>
          CISF spans <b>all pillars</b> but has <b>search-only</b> access — officers verify a pass number against the physical card at
          the gate and cannot view registers or edit records. This scope is fixed and not configurable.
        </p>
      </section>
    </div>
  );
}
