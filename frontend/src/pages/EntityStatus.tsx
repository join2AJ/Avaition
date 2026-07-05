import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { useData } from "@/app/data";
import { Pill } from "@/components/ui";
import { ZONES } from "@/domain/zones";

// A tiny deterministic status per entity doc (demo) so the compliance grid is
// meaningful without a backend.
function docStatus(entityId: string, key: string): "ok" | "pending" | "expired" {
  const h = (entityId + key).split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 6;
  return h === 0 ? "expired" : h === 1 ? "pending" : "ok";
}
const STATUS_ICON = { ok: <CheckCircle2 size={14} />, pending: <Clock size={14} />, expired: <XCircle size={14} /> };
const STATUS_TONE = { ok: "green", pending: "amber", expired: "red" } as const;
const ENTITY_DOCS = ["Security Programme", "Security Clearance", "AOP / NSOP", "NCASP", "Contract"];

export default function EntityStatus() {
  const { entities, individuals } = useData();
  const [f, setF] = useState({ state: "", district: "", religion: "", blood: "", zone: "", role: "" });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  const uniq = (sel: (i: (typeof individuals)[number]) => string | undefined) =>
    Array.from(new Set(individuals.map(sel).filter(Boolean))) as string[];

  const filtered = useMemo(() => individuals.filter((i) =>
    (!f.state || i.state === f.state) && (!f.district || i.district === f.district) &&
    (!f.religion || i.religion === f.religion) && (!f.blood || i.bloodGroup === f.blood) &&
    (!f.zone || (i.zones ?? []).includes(f.zone)) && (!f.role || i.jobRole === f.role)), [individuals, f]);

  const entName = (id: string) => entities.find((e) => e.id === id)?.name ?? id;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Entity &amp; individual status</h2>
          <p className="muted">Entity-wise compliance (Security Programme, Clearance, AOP/NSOP, NCASP, Contract) and individuals sliced by state, district, religion, blood group, zone or role.</p>
        </div>
      </div>

      <section className="card">
        <div className="card-head card-pad" style={{ paddingBottom: 8 }}><span className="section-title">Entity-wise document status</span></div>
        <div className="matrix-scroll">
          <table className="sur-table">
            <thead><tr><th>Entity</th><th>Category</th><th>Status</th>{ENTITY_DOCS.map((d) => <th key={d}>{d}</th>)}</tr></thead>
            <tbody>
              {entities.map((e) => (
                <tr key={e.id}>
                  <td><b>{e.name}</b></td>
                  <td className="muted">{e.category}</td>
                  <td><Pill tone={e.status === "active" ? "green" : e.status === "suspended" ? "amber" : "slate"} dot>{e.status}</Pill></td>
                  {ENTITY_DOCS.map((d) => {
                    const s = docStatus(e.id, d);
                    return <td key={d}><span className={`doc-stat tone-${STATUS_TONE[s]}`}>{STATUS_ICON[s]} {s}</span></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card card-pad">
        <div className="card-head"><span className="section-title">Individuals</span><span className="muted" style={{ fontSize: 12 }}>{filtered.length} of {individuals.length}</span></div>
        <div className="filter-row">
          {([["state", "State", uniq((i) => i.state)], ["district", "District", uniq((i) => i.district)],
             ["religion", "Religion", uniq((i) => i.religion)], ["blood", "Blood group", uniq((i) => i.bloodGroup)],
             ["role", "Role", uniq((i) => i.jobRole)]] as const).map(([k, label, opts]) => (
            <select key={k} className="field mini" value={(f as any)[k]} onChange={(e) => set(k as keyof typeof f, e.target.value)}>
              <option value="">Any {label.toLowerCase()}</option>
              {opts.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          <select className="field mini" value={f.zone} onChange={(e) => set("zone", e.target.value)}>
            <option value="">Any zone</option>
            {ZONES.map((z) => <option key={z.code} value={z.code}>{z.code}</option>)}
          </select>
        </div>
        <div className="matrix-scroll" style={{ marginTop: 12 }}>
          <table className="sur-table">
            <thead><tr><th>ID</th><th>Name</th><th>Entity</th><th>Role</th><th>State</th><th>District</th><th>Religion</th><th>Blood</th><th>Zones</th></tr></thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td className="mono">{i.id}</td><td><b>{i.name}</b></td><td className="muted">{entName(i.entityId)}</td>
                  <td>{i.jobRole}</td><td>{i.state}</td><td>{i.district}</td><td>{i.religion}</td><td className="mono">{i.bloodGroup}</td>
                  <td><span className="zone-chips">{(i.zones ?? []).map((z) => <span key={z} className="zone-chip mono">{z}</span>)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
