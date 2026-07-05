import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, IdCard, FileCheck2, PenLine, Grid3x3, ArrowRight, ArrowLeft, Upload, Plus, Trash2 } from "lucide-react";
import { ZONES } from "@/domain/zones";
import { useData } from "@/app/data";
import type { Signatory, EntityDoc, EntityJobRole } from "@/domain/types";
import { ClauseBadge } from "@/components/ui";

const STEPS = [
  { key: "identity", label: "Identity", icon: IdCard },
  { key: "docs", label: "Compliance docs", icon: FileCheck2 },
  { key: "signatories", label: "Signatories", icon: PenLine },
  { key: "jobzones", label: "Job roles & zones", icon: Grid3x3 },
];

const DOC_DEFS = [
  "Security Clearance (BCAS) # + expiry",
  "Security Programme (BCAS-approved)",
  "Contract / LOI / LOA / PO",
  "NCASP compliance declaration",
  "AOP / NSOP linkage",
];

export default function EntityOnboarding() {
  const { createEntity } = useData();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Ground Handling Agency");
  const [strength, setStrength] = useState(20);
  const [policyRef, setPolicyRef] = useState("");
  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");

  const [docs, setDocs] = useState<EntityDoc[]>(DOC_DEFS.map((name) => ({ name })));
  const setDoc = (i: number, patch: Partial<EntityDoc>) => setDocs((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const [sigs, setSigs] = useState<Signatory[]>([
    { name: "", designation: "", certifiedBy: "MD" }, { name: "", designation: "", certifiedBy: "CEO" },
  ]);
  const setSig = (i: number, patch: Partial<Signatory>) => setSigs((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const addSig = () => sigs.length < 5 && setSigs((s) => [...s, { name: "", designation: "", certifiedBy: "CSO" }]);
  const delSig = (i: number) => sigs.length > 2 && setSigs((s) => s.filter((_, j) => j !== i));

  const [jobRoles, setJobRoles] = useState<EntityJobRole[]>([{ role: "", zones: [], justification: "" }]);
  const setJR = (i: number, patch: Partial<EntityJobRole>) => setJobRoles((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const toggleJRZone = (i: number, code: string) =>
    setJR(i, { zones: jobRoles[i].zones.includes(code) ? jobRoles[i].zones.filter((z) => z !== code) : [...jobRoles[i].zones, code] });
  const addJR = () => setJobRoles((r) => [...r, { role: "", zones: [], justification: "" }]);

  const validSigs = sigs.filter((s) => s.name.trim()).length;
  const canComplete = name.trim() && policyRef.trim() && validSigs >= 2;

  const complete = () => {
    const e = createEntity({
      name, category, strength, policyRef, contractStart, contractEnd,
      signatories: sigs.filter((s) => s.name.trim()),
      docs: docs.filter((d) => d.reference || d.fileName || d.expiry),
      jobRoles: jobRoles.filter((j) => j.role.trim()),
    });
    setDone(`Created ${e.id}`);
    setTimeout(() => nav("/app/applications"), 800);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Entity onboarding</h2>
          <p className="muted">One registration serves all three pillars. Min 2, max 5 Authorized Signatories · certified by MD/CEO/CSO · original signatures only · §13A.</p>
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
            <div className="form-2col">
              <label className="fld"><span className="fld-l req">Entity name</span><input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Company / agency name" /></label>
              <label className="fld"><span className="fld-l req">Category <ClauseBadge>§3 categories</ClauseBadge></span>
                <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {["Ground Handling Agency", "Scheduled Airline", "Concessionaire", "Cargo / Logistics", "MRO / AMO", "Govt Agency", "Contractor"].map((c) => <option key={c}>{c}</option>)}
                </select></label>
            </div>
            <div className="form-2col">
              <label className="fld"><span className="fld-l">Entity strength</span><input className="field" type="number" value={strength} onChange={(e) => setStrength(+e.target.value)} /><span className="fld-hint">{strength > 15 ? "> 15 · self-service login + DSC" : "≤ 15 · applications via Pass Section"}</span></label>
              <label className="fld"><span className="fld-l req">Governing policy reference <ClauseBadge>mandatory</ClauseBadge></span><input className="field" value={policyRef} onChange={(e) => setPolicyRef(e.target.value)} placeholder="AVSEC clause / internal standard" /></label>
            </div>
            <div className="form-2col">
              <label className="fld"><span className="fld-l">Contract start</span><input className="field" type="date" value={contractStart} onChange={(e) => setContractStart(e.target.value)} /></label>
              <label className="fld"><span className="fld-l">Contract end</span><input className="field" type="date" value={contractEnd} onChange={(e) => setContractEnd(e.target.value)} /><span className="fld-hint">AEP is co-terminus with the earliest of clearance / NSOP-AOP / contract.</span></label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="wiz-form">
            <p className="muted" style={{ fontSize: 12.5 }}>Attach the mandatory compliance documents. Expired mandatory doc ⇒ new applications blocked · §3 gates.</p>
            {docs.map((d, i) => (
              <div className="doc-row" key={d.name}>
                <span className="doc-name">{d.name}{i < 4 && <span className="req-dot" />}</span>
                <input className="field mini" placeholder="Reference / number" value={d.reference || ""} onChange={(e) => setDoc(i, { reference: e.target.value })} />
                <input className="field mini" type="date" title="Expiry" value={d.expiry || ""} onChange={(e) => setDoc(i, { expiry: e.target.value })} />
                <label className="upload-btn"><Upload size={13} /> {d.fileName ? d.fileName.slice(0, 14) : "Upload"}
                  <input type="file" hidden onChange={(e) => setDoc(i, { fileName: e.target.files?.[0]?.name })} /></label>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="wiz-form">
            <p className="muted" style={{ fontSize: 12.5 }}>Min <b>2</b>, max <b>5</b> · certified by MD/CEO/CSO · original signatures only. Currently {validSigs} valid.</p>
            {sigs.map((s, i) => (
              <div className="sig-row2" key={i}>
                <input className="field" placeholder={`Signatory ${i + 1} name`} value={s.name} onChange={(e) => setSig(i, { name: e.target.value })} />
                <input className="field" placeholder="Designation" value={s.designation} onChange={(e) => setSig(i, { designation: e.target.value })} />
                <select className="field" value={s.certifiedBy} onChange={(e) => setSig(i, { certifiedBy: e.target.value })}>
                  <option>MD</option><option>CEO</option><option>CSO</option>
                </select>
                <input className="field" placeholder="DSC (if >15)" value={s.dsc || ""} onChange={(e) => setSig(i, { dsc: e.target.value })} />
                <button className="icon-btn" disabled={sigs.length <= 2} onClick={() => delSig(i)}><Trash2 size={15} /></button>
              </div>
            ))}
            <button className="btn btn-ghost" disabled={sigs.length >= 5} onClick={addSig} style={{ alignSelf: "flex-start" }}><Plus size={15} /> Add signatory</button>
          </div>
        )}

        {step === 3 && (
          <div className="wiz-form">
            <p className="muted" style={{ fontSize: 12.5 }}>Entities may define their own job roles and the zones each needs, with justification. Requested zones become the entity's entitled set (re-confirmed at renewal) · need-to-access.</p>
            {jobRoles.map((jr, i) => (
              <div className="jr-card" key={i}>
                <input className="field" placeholder="Job role (e.g. Ramp Agent)" value={jr.role} onChange={(e) => setJR(i, { role: e.target.value })} />
                <div className="jr-zones">
                  {ZONES.map((z) => (
                    <button key={z.code} className={`zone-opt ${jr.zones.includes(z.code) ? "on" : ""} ${z.sra ? "sra" : ""}`} onClick={() => toggleJRZone(i, z.code)} title={z.label}>
                      <span className="mono">{z.code}</span>{jr.zones.includes(z.code) && <Check size={11} />}
                    </button>
                  ))}
                </div>
                <input className="field" placeholder="Justification for these zones (functional need)" value={jr.justification} onChange={(e) => setJR(i, { justification: e.target.value })} />
              </div>
            ))}
            <button className="btn btn-ghost" onClick={addJR} style={{ alignSelf: "flex-start" }}><Plus size={15} /> Add job role</button>
          </div>
        )}
      </section>

      <div className="wizard-nav">
        <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}><ArrowLeft size={15} /> Back</button>
        {step < STEPS.length - 1
          ? <button className="btn btn-brand" onClick={() => setStep((s) => s + 1)}>Continue <ArrowRight size={15} /></button>
          : <button className="btn btn-brand" disabled={!canComplete || !!done} onClick={complete}>{done ?? <><Check size={15} /> Complete onboarding</>}</button>}
      </div>
    </div>
  );
}
