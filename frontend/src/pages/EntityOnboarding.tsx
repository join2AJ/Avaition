import { useState } from "react";
import { Check, IdCard, FileCheck2, PenLine, Grid3x3, ArrowRight, ArrowLeft } from "lucide-react";
import { ZONES } from "@/domain/zones";
import { ClauseBadge } from "@/components/ui";

const STEPS = [
  { key: "identity", label: "Identity", icon: IdCard },
  { key: "docs", label: "Compliance docs", icon: FileCheck2 },
  { key: "signatories", label: "Signatories", icon: PenLine },
  { key: "zonemap", label: "Zone-need matrix", icon: Grid3x3 },
];

const JOB_ROLES = ["Ramp Agent", "Baggage Handler", "Catering Loader", "Fuel Technician", "Security Screener"];

export default function EntityOnboarding() {
  const [step, setStep] = useState(0);
  const [grid, setGrid] = useState<Record<string, boolean>>({});
  const toggle = (r: string, z: string) => setGrid((g) => ({ ...g, [`${r}|${z}`]: !g[`${r}|${z}`] }));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Entity onboarding</h2>
          <p className="muted">One registration serves all three pillars. Zone entitlement is mapped to job roles at step 4 · §3.</p>
        </div>
      </div>

      <div className="wizard-steps">
        {STEPS.map((s, i) => (
          <button className={`wiz-step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`} key={s.key} onClick={() => setStep(i)}>
            <span className="wiz-node">{i < step ? <Check size={14} /> : <s.icon size={15} />}</span>
            <span className="wiz-label"><small>Step {i + 1}</small>{s.label}</span>
          </button>
        ))}
      </div>

      <section className="card card-pad wizard-body">
        {step === 0 && (
          <div className="wiz-form">
            <label className="fld"><span className="fld-l req">Entity category <ClauseBadge>§3 categories</ClauseBadge></span>
              <select className="field"><option>Ground Handling Agency</option><option>Scheduled Airline</option><option>Concessionaire</option><option>Cargo / Logistics</option><option>MRO / AMO</option><option>Govt Agency</option><option>Contractor</option></select></label>
            <label className="fld"><span className="fld-l req">Governing policy reference <ClauseBadge>mandatory on every admin creation</ClauseBadge></span><input className="field" placeholder="AVSEC clause or internal standard" /></label>
            <label className="fld"><span className="fld-l">Entity strength (active individuals)</span><input className="field" type="number" placeholder="e.g. 240 · >15 unlocks self-service login" /></label>
          </div>
        )}
        {step === 1 && (
          <div className="wiz-form">
            {["Security Clearance (BCAS) # + expiry", "Security Programme (BCAS-approved)", "Contract / LOI / LOA / PO", "NCASP compliance declaration", "AOP / NSOP linkage"].map((d, i) => (
              <label className="fld" key={d}><span className={`fld-l ${i < 3 ? "req" : ""}`}>{d}</span><input className="field" placeholder="Reference / upload" /></label>
            ))}
            <p className="muted" style={{ fontSize: 12 }}>Schema varies by category · expired mandatory doc ⇒ new applications blocked · §3 entity gates.</p>
          </div>
        )}
        {step === 2 && (
          <div className="wiz-form">
            <p className="muted" style={{ fontSize: 13 }}>Max <b>5</b> Authorized Signatories per entity per airport · certified by MD/CEO/CSO · original signatures only.</p>
            {[0, 1].map((i) => (
              <div className="sig-row" key={i}>
                <input className="field" placeholder={`Signatory ${i + 1} name`} />
                <input className="field" placeholder="Designation" />
                <input className="field" placeholder="DSC (if >15 employees)" />
              </div>
            ))}
          </div>
        )}
        {step === 3 && (
          <div className="zone-matrix-wrap">
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>Check the zones each job role needs — checked cells become the entity's entitled set (re-confirmed at renewal).</p>
            <div className="zone-matrix">
              <table>
                <thead><tr><th>Job role</th>{ZONES.slice(0, 9).map((z) => <th key={z.code} className="mono">{z.code}</th>)}</tr></thead>
                <tbody>
                  {JOB_ROLES.map((r) => (
                    <tr key={r}><td>{r}</td>
                      {ZONES.slice(0, 9).map((z) => (
                        <td key={z.code} className="mx-cell" onClick={() => toggle(r, z.code)}>
                          <span className={`mx-box ${grid[`${r}|${z.code}`] ? "on" : ""}`}>{grid[`${r}|${z.code}`] && <Check size={12} />}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <div className="wizard-nav">
        <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}><ArrowLeft size={15} /> Back</button>
        {step < STEPS.length - 1
          ? <button className="btn btn-brand" onClick={() => setStep((s) => s + 1)}>Continue <ArrowRight size={15} /></button>
          : <button className="btn btn-brand"><Check size={15} /> Complete onboarding</button>}
      </div>
    </div>
  );
}
