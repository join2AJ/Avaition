import { useEffect, useState } from "react";
import { ScanSearch, Building2, MapPin, CheckCircle2, XCircle, Layers } from "lucide-react";
import type { Application, Entity } from "@/domain/types";
import { api, entityName } from "@/lib/api";
import { STATUS_META } from "@/domain/status";
import { Pill, PillarBadge, ZoneChips, ClauseBadge } from "@/components/ui";

// CISF gate verification — search-only. Officer types a pass number
// (AEP / protocol / ToT / VEP-ADP) and confirms the on-screen record against
// the physical card in the holder's hand. No dashboard, no editing.
export default function Verify() {
  const [apps, setApps] = useState<Application[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [q, setQ] = useState("");
  const [result, setResult] = useState<Application | null | undefined>(undefined);

  useEffect(() => {
    api.listApplications().then(setApps);
    api.listEntities().then(setEntities);
  }, []);

  const search = () => {
    const needle = q.trim().toLowerCase();
    if (!needle) { setResult(undefined); return; }
    const hit = apps.find(
      (a) => a.id.toLowerCase() === needle || a.id.toLowerCase().includes(needle) || a.subject.toLowerCase().includes(needle),
    );
    setResult(hit ?? null);
  };

  const valid = result && (result.status === "issued" || result.status === "approved");

  return (
    <div className="page verify-page">
      <div className="page-head">
        <div>
          <h2>Verify pass at gate</h2>
          <p className="muted">Enter a pass number to confirm the record against the physical card. CISF · verification only.</p>
        </div>
      </div>

      <div className="card card-pad verify-search">
        <div className="verify-input">
          <ScanSearch size={18} className="muted" />
          <input
            className="verify-field"
            placeholder="AEP no. · protocol no. · ToT no. · VEP / ADP  (e.g. APP-2258)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            autoFocus
          />
          <button className="btn btn-brand" onClick={search}>Verify</button>
        </div>
        <p className="muted verify-hint">All pillars searchable — MAN (AEP/TAEP), MATERIAL (ToT), VEHICLE (VEP/ADP).</p>
      </div>

      {result === null && (
        <div className="card card-pad verify-miss">
          <XCircle size={20} className="stop-ic" /> No pass found for “{q}”. Do not admit on this record — escalate to Pass Section.
        </div>
      )}

      {result && (
        <div className={`card verify-result ${valid ? "ok" : "warn"}`}>
          <div className="verify-banner">
            {valid ? <><CheckCircle2 size={18} /> Valid — match against the physical card</>
                   : <><XCircle size={18} /> Not currently issued — {STATUS_META[result.status].label}. Verify before admitting.</>}
          </div>
          <div className="verify-body">
            <div className="vr-row"><span className="vr-k">Pass no.</span><span className="mono vr-v">{result.id}</span></div>
            <div className="vr-row"><span className="vr-k">Holder / item</span><span className="vr-v">{result.subject}</span></div>
            <div className="vr-row"><span className="vr-k">Pillar</span><span className="vr-v"><PillarBadge pillar={result.pillar} /> <span className="mono">{result.passType}</span></span></div>
            <div className="vr-row"><span className="vr-k">Sponsor</span><span className="vr-v"><Building2 size={13} /> {entityName(result.entityId, entities)}</span></div>
            <div className="vr-row"><span className="vr-k">Zones</span><span className="vr-v"><MapPin size={13} /> <ZoneChips codes={result.zones} /></span></div>
            <div className="vr-row"><span className="vr-k">Status</span><span className="vr-v"><Pill tone={STATUS_META[result.status].tone} dot>{STATUS_META[result.status].label}</Pill></span></div>
            <div className="vr-row"><span className="vr-k">Reference</span><span className="vr-v"><Layers size={13} /> <ClauseBadge>AVSEC Order 02/2022 {result.clauseRef}</ClauseBadge></span></div>
            {result.expiryDate && <div className="vr-row"><span className="vr-k">Expiry</span><span className="vr-v mono">{result.expiryDate}</span></div>}
          </div>
        </div>
      )}
    </div>
  );
}
