import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, UserPlus, Plane, Wrench, Truck, Check, ArrowRight } from "lucide-react";
import { useData } from "@/app/data";
import { PILLARS, type Pillar, type PassType } from "@/domain/types";
import { ZONES } from "@/domain/zones";
import { ClauseBadge } from "@/components/ui";

type Tab = "pass" | "entity" | "individual";

const PILLAR_ICON = { MAN: Plane, MATERIAL: Wrench, VEHICLE: Truck };
const PASS_TYPES: Record<Pillar, PassType[]> = {
  MAN: ["BAEP", "TAEP", "VAT", "Permanent"],
  MATERIAL: ["ToT"],
  VEHICLE: ["VEP"],
};

export default function Create() {
  const { entities, createEntity, createIndividual, createApplication } = useData();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("pass");
  const [done, setDone] = useState<string | null>(null);

  // pass form
  const [pillar, setPillar] = useState<Pillar>("MAN");
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [passType, setPassType] = useState<PassType>("BAEP");
  const [zones, setZones] = useState<string[]>([]);
  const [adp, setAdp] = useState("");

  // entity form
  const [eName, setEName] = useState("");
  const [eCat, setECat] = useState("Ground Handling Agency");
  const [eStrength, setEStrength] = useState(20);
  const [ePolicy, setEPolicy] = useState("");

  // individual form
  const [iName, setIName] = useState("");
  const [iRole, setIRole] = useState("Ramp Agent");
  const [iLogin, setILogin] = useState(false);

  const toggleZone = (c: string) => setZones((z) => (z.includes(c) ? z.filter((x) => x !== c) : [...z, c]));

  const submitPass = () => {
    const subj = pillar === "VEHICLE" && adp ? `${subject} · ADP ${adp}` : subject;
    const app = createApplication({ pillar, entityId, subject: subj, passType, zones });
    setDone(`Raised ${app.id}`);
    setTimeout(() => nav(`/app/applications/${app.id}`), 700);
  };

  return (
    <div className="page create-page">
      <div className="page-head">
        <div>
          <h2>Create</h2>
          <p className="muted">One entity registration feeds all three pillars. Every creation carries a governing policy reference · §3.</p>
        </div>
      </div>

      <div className="create-tabs">
        <button className={`ctab ${tab === "pass" ? "active" : ""}`} onClick={() => setTab("pass")}><Plane size={15} /> Raise a pass</button>
        <button className={`ctab ${tab === "entity" ? "active" : ""}`} onClick={() => setTab("entity")}><Building2 size={15} /> New entity</button>
        <button className={`ctab ${tab === "individual" ? "active" : ""}`} onClick={() => setTab("individual")}><UserPlus size={15} /> New individual</button>
      </div>

      {tab === "pass" && (
        <section className="card card-pad create-form">
          <div className="fld">
            <span className="fld-l">Pillar</span>
            <div className="pillar-pick">
              {PILLARS.map((p) => {
                const Icon = PILLAR_ICON[p.key];
                return (
                  <button key={p.key} className={`pillar-opt ${pillar === p.key ? "active" : ""}`}
                    onClick={() => { setPillar(p.key); setPassType(PASS_TYPES[p.key][0]); setSubject(""); }}>
                    <Icon size={18} /><b>{p.roman} · {p.label}</b><small>{p.pass}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-2col">
            <label className="fld"><span className="fld-l req">Sponsoring entity</span>
              <select className="field" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
                {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select></label>
            <label className="fld"><span className="fld-l req">Pass type</span>
              <select className="field" value={passType} onChange={(e) => setPassType(e.target.value as PassType)}>
                {PASS_TYPES[pillar].map((t) => <option key={t} value={t}>{t}</option>)}
              </select></label>
          </div>

          <label className="fld"><span className="fld-l req">
            {pillar === "MAN" ? "Applicant name" : pillar === "MATERIAL" ? "Tool / item description" : "Vehicle registration + type"}
          </span>
            <input className="field" value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder={pillar === "MAN" ? "e.g. R. Sharma" : pillar === "MATERIAL" ? "e.g. AME Toolkit · V. Singh (Annexure C · D)" : "e.g. DL-1GC-4471 · pushback tug"} /></label>

          {pillar === "VEHICLE" && (
            <label className="fld"><span className="fld-l req">Driver Airside Driving Permit (ADP)</span>
              <input className="field" value={adp} onChange={(e) => setAdp(e.target.value)} placeholder="ADP holder / permit no. · §14" /></label>
          )}

          <div className="fld"><span className="fld-l">Zones requested <ClauseBadge>need-to-access</ClauseBadge></span>
            <div className="zone-pick">
              {ZONES.map((z) => (
                <button key={z.code} className={`zone-opt ${zones.includes(z.code) ? "on" : ""} ${z.sra ? "sra" : ""}`} onClick={() => toggleZone(z.code)} title={z.label}>
                  <span className="mono">{z.code}</span>{zones.includes(z.code) && <Check size={11} />}
                </button>
              ))}
            </div>
          </div>

          <div className="create-foot">
            <span className="muted" style={{ fontSize: 12 }}>On save: Stop List check, then category checklist auto-loads (Uploaded → Verified before advancing).</span>
            <button className="btn btn-brand" disabled={!subject.trim() || !!done} onClick={submitPass}>
              {done ?? <>Raise pass <ArrowRight size={15} /></>}
            </button>
          </div>
        </section>
      )}

      {tab === "entity" && (
        <section className="card card-pad create-form">
          <div className="form-2col">
            <label className="fld"><span className="fld-l req">Entity name</span><input className="field" value={eName} onChange={(e) => setEName(e.target.value)} placeholder="Company / agency name" /></label>
            <label className="fld"><span className="fld-l req">Category <ClauseBadge>§3 categories</ClauseBadge></span>
              <select className="field" value={eCat} onChange={(e) => setECat(e.target.value)}>
                {["Ground Handling Agency", "Scheduled Airline", "Concessionaire", "Cargo / Logistics", "MRO / AMO", "Govt Agency", "Contractor"].map((c) => <option key={c}>{c}</option>)}
              </select></label>
          </div>
          <div className="form-2col">
            <label className="fld"><span className="fld-l">Entity strength</span><input className="field" type="number" value={eStrength} onChange={(e) => setEStrength(+e.target.value)} /><span className="fld-hint">{eStrength > 15 ? "> 15 · self-service login unlocked" : "≤ 15 · applications via Pass Section"}</span></label>
            <label className="fld"><span className="fld-l req">Governing policy reference <ClauseBadge>mandatory</ClauseBadge></span><input className="field" value={ePolicy} onChange={(e) => setEPolicy(e.target.value)} placeholder="AVSEC clause / internal standard" /></label>
          </div>
          <div className="create-foot">
            <span className="muted" style={{ fontSize: 12 }}>One registration serves MAN, MATERIAL and VEHICLE applications.</span>
            <button className="btn btn-brand" disabled={!eName.trim() || !ePolicy.trim() || !!done}
              onClick={() => { const e = createEntity({ name: eName, category: eCat, strength: eStrength, policyRef: ePolicy }); setDone(`Created ${e.id}`); setTimeout(() => nav("/app/applications"), 700); }}>
              {done ?? <>Create entity <Check size={15} /></>}
            </button>
          </div>
        </section>
      )}

      {tab === "individual" && (
        <section className="card card-pad create-form">
          <div className="form-2col">
            <label className="fld"><span className="fld-l req">Full name</span><input className="field" value={iName} onChange={(e) => setIName(e.target.value)} placeholder="Applicant full name" /></label>
            <label className="fld"><span className="fld-l req">Entity</span>
              <select className="field" value={entityId} onChange={(e) => setEntityId(e.target.value)}>{entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
          </div>
          <label className="fld"><span className="fld-l req">Job role <ClauseBadge>drives zone-need</ClauseBadge></span>
            <select className="field" value={iRole} onChange={(e) => setIRole(e.target.value)}>
              {["Ramp Agent", "Baggage Handler", "Catering Loader", "Fuel Technician", "Security Screener", "Cargo Handler", "ATC Support Engineer"].map((r) => <option key={r}>{r}</option>)}
            </select></label>
          <label className="check-row"><input type="checkbox" checked={iLogin} onChange={(e) => setILogin(e.target.checked)} /> Authorize self-check login (individual can track own application status)</label>
          <div className="create-foot">
            <span className="muted" style={{ fontSize: 12 }}>Individuals can be created by the Entity (own staff) or Pass Section (entities &lt; 15).</span>
            <button className="btn btn-brand" disabled={!iName.trim() || !!done}
              onClick={() => { const i = createIndividual({ entityId, name: iName, jobRole: iRole, loginAuthorized: iLogin }); setDone(`Created ${i.id}`); setTimeout(() => setDone(null), 900); setIName(""); }}>
              {done ?? <>Create individual <Check size={15} /></>}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
