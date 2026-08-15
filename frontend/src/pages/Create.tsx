import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Plane, Wrench, Truck, Check, ArrowRight, CalendarClock } from "lucide-react";
import { useData } from "@/app/data";
import { useAuth } from "@/app/auth";
import { PILLARS, type Pillar, type PassType } from "@/domain/types";
import { ZONES } from "@/domain/zones";
import { JOB_ROLES, computeValidTo, today } from "@/domain/entitlements";
import { ClauseBadge } from "@/components/ui";
import { subTabKey } from "@/app/nav";
import EntityOnboarding from "./EntityOnboarding";

type Tab = "pass" | "onboard";

const PILLAR_ICON = { MAN: Plane, MATERIAL: Wrench, VEHICLE: Truck };
const PASS_TYPES: Record<Pillar, PassType[]> = {
  // Protocol (paper), One-Day and TAEP (≤30 days) need no BGC; >30 days needs a
  // BCAS-approval exception; BAEP/PAEP (>31 days) is the biometric permanent card.
  MAN: ["BAEP", "Permanent", "TAEP", "VAT"],
  MATERIAL: ["ToT"],
  // ADP (driver) is applied FIRST; the VAP is issued against a valid ADP.
  VEHICLE: ["ADP", "VAP"],
};
// MAN sub-type presets shown as quick chips.
const MAN_SUBTYPES = ["BAEP (>31 days)", "TAEP (≤30 days)", "One-Day", "Protocol (paper)"];
const MATERIAL_SUBTYPES = ["One-Day", "One-month", "Quarterly (3 mo)"];

export default function Create() {
  const { entities, individuals, roleZones, contracts, applications, createApplication, isStopListed, screenStopList, taepDaysUsed, isTabHidden } = useData();
  const { session } = useAuth();
  const nav = useNavigate();
  const isAdmin = session?.role === "admin";
  const [tab, setTab] = useState<Tab>("pass");
  // Access-control: sub-tabs an Admin has hidden for this login are dropped, and
  // the active tab falls back to the first still-visible one.
  const CREATE_TABS: { key: Tab; label: string; icon: typeof Plane }[] = [
    { key: "pass", label: "Raise a pass", icon: Plane },
    { key: "onboard", label: "Onboard entity", icon: Building2 },
  ];
  const visTabs = CREATE_TABS.filter((t) => !isTabHidden(session!.role, subTabKey("/app/create", t.key)));
  const activeTab: Tab | undefined = visTabs.some((t) => t.key === tab) ? tab : visTabs[0]?.key;
  const [done, setDone] = useState<string | null>(null);

  // pass form
  const [pillar, setPillar] = useState<Pillar>("MAN");
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [jobRole, setJobRole] = useState(JOB_ROLES[0]);
  const [passType, setPassType] = useState<PassType>("BAEP");
  const [zones, setZones] = useState<string[]>(() => {
    const ent = entities.find((e) => e.id === (entities[0]?.id));
    const entZones = new Set(ent?.entitledZones ?? []);
    return (roleZones[JOB_ROLES[0]] ?? []).filter((z) => entZones.has(z));
  });
  const [adp, setAdp] = useState("");
  const [escort, setEscort] = useState("");
  const [validFrom, setValidFrom] = useState(today());
  const [subType, setSubType] = useState("");
  const entityContracts = contracts.filter((c) => c.entityId === entityId && c.status === "active");
  const [contractId, setContractId] = useState(entityContracts[0]?.id ?? "");

  // Company → role gating: a person only gets a zone if BOTH the entity is
  // entitled to it AND the job role needs it. Role access is capped by company
  // access (role zones ∩ entity zones). For MATERIAL/VEHICLE (no job role) the
  // entity's entitled set is proposed.
  const autofillZones = (eId: string, role: string, p: Pillar) => {
    const ent = entities.find((e) => e.id === eId);
    const entZones = new Set(ent?.entitledZones ?? []);
    if (p === "MAN") {
      const need = roleZones[role] ?? [];
      setZones(need.filter((z) => entZones.has(z)));
    } else {
      setZones(Array.from(entZones));
    }
  };
  const onEntity = (eId: string) => { setEntityId(eId); autofillZones(eId, jobRole, pillar); };
  const onRole = (r: string) => { setJobRole(r); autofillZones(entityId, r, pillar); };
  const onPillar = (p: Pillar) => { setPillar(p); setPassType(PASS_TYPES[p][0]); setSubject(""); autofillZones(entityId, jobRole, p); };

  const contractEnd = entityContracts.find((c) => c.id === contractId)?.end;
  const validTo = computeValidTo(passType, validFrom, contractEnd);

  const [bcasApproval, setBcasApproval] = useState(false);

  const toggleZone = (c: string) => setZones((z) => (z.includes(c) ? z.filter((x) => x !== c) : [...z, c]));

  // §8.3.4.12 / §12B — Escort binding. Material (ToT) and a TAEP holder can only
  // enter an SRA if a named AEP holder escorts them, and only into zones that
  // escort is themselves entitled to. Eligible escorts are AEP holders (any
  // entity) whose granted zones cover every SRA zone requested here.
  const sraSet = new Set(ZONES.filter((z) => z.sra).map((z) => z.code));
  const requestedSra = zones.filter((z) => sraSet.has(z));
  const needsEscort = requestedSra.length > 0 && (pillar === "MATERIAL" || (pillar === "MAN" && passType === "TAEP"));
  // A registered AEP holder whose granted zones cover every requested SRA zone,
  // is not stop-listed, and holds no rejected/withdrawn/surrendered-only record.
  const eligibleEscorts = needsEscort
    ? individuals.filter((i) =>
        requestedSra.every((z) => (i.zones ?? []).includes(z)) &&
        !isStopListed(i.name) &&
        !applications.some((a) => a.subject === i.name && ["withdrawn", "surrendered"].includes(a.status)))
    : [];
  const escortInd = individuals.find((i) => i.name === escort);
  const escortValid = !needsEscort || (!!escortInd && requestedSra.every((z) => (escortInd.zones ?? []).includes(z)));

  // Company gating (§3) — a pass can never request a zone the sponsoring entity
  // was not itself entitled to at onboarding. Autofill respects this, but a
  // manual toggle must not slip past it; over-entitlement blocks issuance
  // (only Admin, acting for BCAS, may override).
  const entityZoneSet = new Set(entities.find((e) => e.id === entityId)?.entitledZones ?? []);
  const overZones = zones.filter((z) => !entityZoneSet.has(z));
  const overEntitlement = overZones.length > 0 && !isAdmin;

  // §9 Stop List screen + §8.3.4.3 TAEP 30-day annual cap.
  const stopHit = pillar === "MAN" && subject.trim() ? isStopListed(subject) : undefined;
  const proposedDays = Math.max(1, Math.round((+new Date(validTo.to) - +new Date(validFrom)) / 86400000));
  const taepUsed = pillar === "MAN" && subject.trim() ? taepDaysUsed(subject) : 0;
  const taepOver = passType === "TAEP" && (taepUsed + proposedDays) > 30;
  const blockedSubmit = !subject.trim() || !!done || !!stopHit || (taepOver && !bcasApproval) || !escortValid || overEntitlement;

  const submitPass = () => {
    if (stopHit) { screenStopList(subject); return; }
    const subj = pillar === "VEHICLE" && adp ? `${subject} · ADP ${adp}` : subject;
    const app = createApplication({
      pillar, entityId, subject: subj, passType, zones,
      jobRole: pillar === "MAN" ? jobRole : undefined, validFrom, contractId,
      escort: needsEscort ? escort : undefined,
    });
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
        {visTabs.map((t) => (
          <button key={t.key} className={`ctab ${activeTab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}><t.icon size={15} /> {t.label}</button>
        ))}
      </div>
      {visTabs.length === 0 && <div className="card card-pad muted">No creation sections are enabled for your login.</div>}

      {activeTab === "pass" && (
        <section className="card card-pad create-form">
          <div className="fld">
            <span className="fld-l">Pillar</span>
            <div className="pillar-pick">
              {PILLARS.map((p) => {
                const Icon = PILLAR_ICON[p.key];
                return (
                  <button key={p.key} className={`pillar-opt ${pillar === p.key ? "active" : ""}`}
                    onClick={() => onPillar(p.key)}>
                    <Icon size={18} /><b>{p.roman} · {p.label}</b><small>{p.pass}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-2col">
            <label className="fld"><span className="fld-l req">Sponsoring entity</span>
              <select className="field" value={entityId} onChange={(e) => onEntity(e.target.value)}>
                {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select><span className="fld-hint">Zones auto-given from this entity's entitled set.</span></label>
            <label className="fld"><span className="fld-l req">Pass type</span>
              <select className="field" value={passType} onChange={(e) => setPassType(e.target.value as PassType)}>
                {PASS_TYPES[pillar].map((t) => <option key={t} value={t}>{t}</option>)}
              </select></label>
          </div>

          <div className="form-2col">
            <label className="fld"><span className="fld-l req">Under contract</span>
              <select className="field" value={contractId} onChange={(e) => setContractId(e.target.value)}>
                {entityContracts.length === 0 && <option value="">— no active contract —</option>}
                {entityContracts.map((c) => <option key={c.id} value={c.id}>{c.id} · {c.counterparty} (till {c.end})</option>)}
              </select><span className="fld-hint">Pass is tied to this contract; it surrenders if the contract ends.</span></label>
            {pillar === "MAN" && (
              <label className="fld"><span className="fld-l req">Job role <ClauseBadge>auto-gives role zones</ClauseBadge></span>
                <select className="field" value={jobRole} onChange={(e) => onRole(e.target.value)}>
                  {JOB_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select></label>
            )}
          </div>

          {(pillar === "MAN" || pillar === "MATERIAL") && (
            <div className="fld"><span className="fld-l">Sub-type</span>
              <div className="subtype-chips">
                {(pillar === "MAN" ? MAN_SUBTYPES : MATERIAL_SUBTYPES).map((s) => (
                  <button key={s} className={`subtype-chip ${subType === s ? "on" : ""}`} onClick={() => setSubType(s)}>{s}</button>
                ))}
              </div>
              {pillar === "MAN" && subType.startsWith("TAEP") && <span className="fld-hint">≤30 days · no BGC · escort required in SRA. Beyond 30 days needs a BCAS-approval exception (§8.3.4.3).</span>}
              {pillar === "MATERIAL" && <span className="fld-hint">Material can only enter a zone the escorting AEP holder is entitled to (§12B).</span>}
            </div>
          )}

          <div className="form-2col">
            <label className="fld"><span className="fld-l req">Valid from</span>
              <input className="field" type="date" value={validFrom} min={isAdmin ? undefined : today()}
                onChange={(e) => setValidFrom(e.target.value)} />
              <span className="fld-hint">{isAdmin ? "Admin may back-date." : "Back-dating blocked — today or forward only."}</span></label>
            <div className="fld"><span className="fld-l">Valid to <ClauseBadge>auto per norms</ClauseBadge></span>
              <div className="valid-to"><CalendarClock size={15} /> <b className="mono">{validTo.to}</b></div>
              <span className="fld-hint">{validTo.cappedByContract ? <b style={{ color: "var(--amber-700)" }}>Capped to contract end (co-terminus · §7A)</b> : validTo.norm}</span></div>
          </div>

          <label className="fld"><span className="fld-l req">
            {pillar === "MAN" ? "Applicant name" : pillar === "MATERIAL" ? "Tool / item description" : "Vehicle registration + type"}
          </span>
            <input className="field" value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder={pillar === "MAN" ? "e.g. R. Sharma" : pillar === "MATERIAL" ? "e.g. AME Toolkit · V. Singh (Annexure C · D)" : "e.g. DL-1GC-4471 · pushback tug"} /></label>

          {pillar === "VEHICLE" && passType !== "ADP" && (
            <label className="fld"><span className="fld-l req">Driver Airside Driving Permit (ADP)</span>
              <input className="field" value={adp} onChange={(e) => setAdp(e.target.value)} placeholder="ADP holder / permit no. · §14" />
              <span className="fld-hint">ADP is applied <b>first</b> — a VAP can only be issued against a valid ADP holder.</span></label>
          )}
          {pillar === "VEHICLE" && passType === "ADP" && (
            <p className="muted" style={{ fontSize: 12 }}>Airside Driving Permit for the driver — create this <b>before</b> the vehicle's VAP · §14.</p>
          )}

          <div className="fld"><span className="fld-l">Zones requested <ClauseBadge>need-to-access</ClauseBadge></span>
            <div className="zone-pick">
              {ZONES.map((z) => {
                const on = zones.includes(z.code);
                const over = on && !entityZoneSet.has(z.code);
                return (
                  <button key={z.code} className={`zone-opt ${on ? "on" : ""} ${z.sra ? "sra" : ""} ${over ? "over" : ""}`} onClick={() => toggleZone(z.code)} title={over ? `${z.label} — entity not entitled to this zone` : z.label}>
                    <span className="mono">{z.code}</span>{on && <Check size={11} />}
                  </button>
                );
              })}
            </div>
            {overZones.length > 0 && (
              <span className="fld-hint" style={{ color: isAdmin ? "var(--amber-700)" : "var(--red-700)" }}>
                {isAdmin ? "Admin override: " : "⛔ "}Zone(s) <b className="mono">{overZones.join(" ")}</b> are outside the sponsoring entity’s entitled set (§3).
                {isAdmin ? " Proceeding on BCAS authority." : " Remove them or have the entity’s entitlement extended before issuance."}
              </span>
            )}
          </div>

          {needsEscort && (
            <div className="fld">
              <span className="fld-l req">Escorting AEP holder <ClauseBadge>SRA escort · §8.3.4.12 · §12B</ClauseBadge></span>
              <select className="field" value={escort} onChange={(e) => setEscort(e.target.value)}>
                <option value="">— select the AEP holder who will escort into {requestedSra.join(", ")} —</option>
                {eligibleEscorts.map((i) => (
                  <option key={i.id} value={i.name}>{i.name} · {entities.find((e) => e.id === i.entityId)?.name ?? i.entityId} · zones {(i.zones ?? []).join(" ")}</option>
                ))}
              </select>
              {eligibleEscorts.length === 0 ? (
                <span className="fld-hint" style={{ color: "var(--red-700)" }}>
                  No AEP holder is entitled to {requestedSra.join(", ")} — the material/TAEP cannot enter these SRA zone(s) unescorted (§12B). Drop the SRA zone or register an entitled escort.
                </span>
              ) : escort ? (
                <span className="fld-hint">Material/TAEP may enter only zones {escortInd?.name} holds: <b className="mono">{(escortInd?.zones ?? []).join(" ")}</b>. Escort accompanies at all times in the SRA.</span>
              ) : (
                <span className="fld-hint">A named escort is mandatory to carry material / take a temporary holder into an SRA.</span>
              )}
            </div>
          )}

          {stopHit && (
            <div className="stop-hit">
              <b>⛔ STOP LIST HIT — issuance hard-blocked (§9).</b>
              <div>{subject} is on the Stop List: {stopHit.reason} · {stopHit.source} ({stopHit.since}). Application cannot proceed.</div>
            </div>
          )}
          {passType === "TAEP" && subject.trim() && (
            <div className={`taep-meter ${taepOver ? "over" : ""}`}>
              <b>TAEP annual cap (§8.3.4.3):</b> {taepUsed} used + {proposedDays} proposed = {taepUsed + proposedDays} / 30 days
              {taepOver && (
                <label className="check-row" style={{ marginTop: 6 }}>
                  <input type="checkbox" checked={bcasApproval} onChange={(e) => setBcasApproval(e.target.checked)} />
                  BCAS approval obtained for exceeding 30 days (mandatory before issuance)
                </label>
              )}
            </div>
          )}

          <div className="create-foot">
            <span className="muted" style={{ fontSize: 12 }}>On save: Stop List check + TAEP cap, then the category checklist auto-loads (Uploaded → Verified before advancing).</span>
            <button className="btn btn-brand" disabled={blockedSubmit} onClick={submitPass}>
              {done ?? (stopHit || overEntitlement ? <>Blocked</> : <>Raise pass <ArrowRight size={15} /></>)}
            </button>
          </div>
        </section>
      )}

      {activeTab === "onboard" && <EntityOnboarding embedded />}
    </div>
  );
}
