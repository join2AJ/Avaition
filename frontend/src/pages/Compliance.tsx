import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ShieldAlert, TimerReset, Ban, Gauge, PauseCircle, TrendingUp, ClipboardCheck, X, ChevronRight } from "lucide-react";
import { useData } from "@/app/data";
import { expiringWithin, entityName } from "@/lib/api";
import { SURPRISE_CHECKS, AUDITED_THIS_YEAR } from "@/lib/demoData";
import { STATUS_META } from "@/domain/status";
import { Pill, PillarBadge } from "@/components/ui";
import type { Application } from "@/domain/types";

// The core insight surface for BCAS and the Aerodrome Operator: compliance vs
// non-compliance across entities, passes and SLAs.
const ENTITY_DOCS = ["Security Programme", "Security Clearance", "AOP / NSOP", "NCASP", "Contract"];
function docStatus(entityId: string, key: string): "ok" | "pending" | "expired" {
  const h = (entityId + key).split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 6;
  return h === 0 ? "expired" : h === 1 ? "pending" : "ok";
}

export default function Compliance() {
  const { entities, applications, contracts } = useData();

  const entityCompliance = useMemo(() => entities.map((e) => {
    const statuses = ENTITY_DOCS.map((d) => docStatus(e.id, d));
    const expired = statuses.filter((s) => s === "expired").length;
    const pending = statuses.filter((s) => s === "pending").length;
    return { e, expired, pending, compliant: expired === 0 && e.status === "active" };
  }), [entities]);

  const compliantCount = entityCompliance.filter((x) => x.compliant).length;
  const complianceRate = Math.round((compliantCount / Math.max(1, entities.length)) * 100);
  const nonCompliant = entityCompliance.filter((x) => !x.compliant);

  const [drill, setDrill] = useState<string | null>(null);
  const exp30List = expiringWithin(applications, 30);
  const exp30 = exp30List.length;
  const exp14 = expiringWithin(applications, 14).length;
  const exp3 = expiringWithin(applications, 3).length;
  // SLA is the processing-turnaround metric — only in-flight applications count.
  // Post-issue lifecycle holds (parked / deactivated) and cancellations
  // (withdrawn) are governance states, surfaced on their own tiles.
  const atRiskList = applications.filter((a) => a.status === "clarification");
  const heldList = applications.filter((a) => a.status === "parked" || a.status === "deactivated");
  const withdrawnList = applications.filter((a) => a.status === "withdrawn");
  const surrenderList = applications.filter((a) => a.status === "surrendered");
  const terminatedList = contracts.filter((c) => c.status === "terminated");
  const atRisk = atRiskList.length, held = heldList.length, withdrawn = withdrawnList.length;
  const overdueSurrender = surrenderList.length, terminatedContracts = terminatedList.length;

  const zoneDist = useMemo(() => {
    const m: Record<string, number> = {};
    applications.forEach((a) => a.zones.forEach((z) => { m[z] = (m[z] ?? 0) + 1; }));
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [applications]);
  const zoneMax = Math.max(1, ...zoneDist.map((z) => z[1]));

  // B2 — issuance trend over the last 12 months, from application intake dates.
  const trend = useMemo(() => {
    const months: { key: string; label: string; n: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleString("en", { month: "short" }), n: 0 });
    }
    const idx = new Map(months.map((m, i) => [m.key, i]));
    applications.forEach((a) => { const k = (a.createdAt || "").slice(0, 7); if (idx.has(k)) months[idx.get(k)!].n += 1; });
    return months;
  }, [applications]);
  const trendMax = Math.max(1, ...trend.map((m) => m.n));

  // B3 — §15 annual 20% audit sample against the registered AEP population.
  const population = entities.reduce((s, e) => s + (e.strength || 0), 0);
  const sampleTarget = Math.ceil(population * 0.2);
  const samplePct = Math.min(100, Math.round((AUDITED_THIS_YEAR / Math.max(1, sampleTarget)) * 100));
  const surpriseMax = Math.max(1, ...SURPRISE_CHECKS.map((c) => c.checks));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Compliance &amp; insights</h2>
          <p className="muted">Airport-wide compliance posture for BCAS &amp; the Aerodrome Operator — who is compliant, what is expiring, where SLAs are slipping.</p>
        </div>
      </div>

      <div className="kpi-grid stagger">
        {([
          ["rate", complianceRate >= 80 ? "var(--green-700)" : "var(--amber-500)", Gauge, `${complianceRate}%`, "Entity compliance rate"],
          ["noncompliant", "var(--red-500)", ShieldAlert, nonCompliant.length, "Non-compliant entities"],
          ["exp30", "var(--amber-500)", TimerReset, exp30, "Passes expiring ≤ 30d"],
          ["held", "var(--amber-500)", PauseCircle, held, "Parked / deactivated"],
          ["withdrawn", "var(--red-500)", Ban, withdrawn, "Withdrawn (§11)"],
          ["atrisk", "var(--amber-500)", ShieldAlert, atRisk, "SLA at risk (clarification)"],
          ["surrender", "var(--ink-400)", Ban, overdueSurrender, "Surrendered / late"],
          ["terminated", "var(--red-500)", Ban, terminatedContracts, "Terminated contracts"],
        ] as const).map(([key, accent, Icon, value, label]) => (
          <button key={key} className={`card kpi kpi-btn ${drill === key ? "active" : ""}`} style={{ ["--kpi-accent" as string]: accent }}
            onClick={() => setDrill(drill === key ? null : key)}>
            <div className="kpi-row"><span className="kpi-icon" style={{ background: accent }}><Icon size={18} /></span><span className="kpi-value">{value}</span></div>
            <div className="kpi-label">{label}</div>
            <span className="kpi-drill-hint">{drill === key ? "hide" : "view"} <ChevronRight size={11} /></span>
          </button>
        ))}
      </div>

      {drill && (
        <ComplianceDrill
          drill={drill} onClose={() => setDrill(null)} entities={entities}
          complianceRate={complianceRate} compliantCount={compliantCount} entityTotal={entities.length}
          nonCompliant={nonCompliant} exp30List={exp30List} heldList={heldList}
          withdrawnList={withdrawnList} atRiskList={atRiskList} surrenderList={surrenderList}
          terminatedList={terminatedList}
        />
      )}

      <div className="dash-grid">
        <section className="card">
          <div className="card-head card-pad" style={{ paddingBottom: 8 }}>
            <span className="section-title"><ShieldAlert size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} /> Non-compliant entities — action required</span>
            <span className="muted" style={{ fontSize: 12 }}>expired / pending mandatory docs</span>
          </div>
          <div className="register">
            {nonCompliant.map(({ e, expired, pending }) => (
              <div className="reg-row nc-row" key={e.id}>
                <span className="reg-subject">{e.name}</span>
                <span className="muted">{e.category}</span>
                <Pill tone={e.status === "active" ? "amber" : "red"} dot>{e.status}</Pill>
                {expired > 0 && <Pill tone="red">{expired} expired</Pill>}
                {pending > 0 && <Pill tone="amber">{pending} pending</Pill>}
              </div>
            ))}
            {nonCompliant.length === 0 && <div className="reg-empty muted">All entities compliant.</div>}
          </div>
        </section>

        <section className="card card-pad">
          <div className="card-head"><span className="section-title">Expiry funnel</span><span className="muted" style={{ fontSize: 12 }}>renew early — start at 30 days</span></div>
          <div className="readiness-bars">
            {[["≤ 30 days", exp30, "var(--green-700)"], ["≤ 14 days", exp14, "var(--amber-500)"], ["≤ 3 days", exp3, "var(--red-500)"]].map(([label, n, tone]) => (
              <div className="rd-row" key={label as string}>
                <span className="rd-label">{label}</span>
                <span className="rd-track"><span className="rd-fill" style={{ width: `${(Number(n) / Math.max(1, exp30)) * 100}%`, background: tone as string }} /></span>
                <span className="rd-pct">{n}</span>
              </div>
            ))}
          </div>
          <div className="card-head" style={{ marginTop: 20 }}><span className="section-title">Zone load</span><span className="muted" style={{ fontSize: 12 }}>top requested zones</span></div>
          <div className="readiness-bars">
            {zoneDist.map(([z, n]) => (
              <div className="rd-row" key={z}>
                <span className="rd-label mono">{z}</span>
                <span className="rd-track"><span className="rd-fill" style={{ width: `${(n / zoneMax) * 100}%`, background: "var(--navy-500)" }} /></span>
                <span className="rd-pct">{n}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="dash-grid">
        <section className="card card-pad">
          <div className="card-head">
            <span className="section-title"><TrendingUp size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} /> Issuance trend</span>
            <span className="muted" style={{ fontSize: 12 }}>applications raised · last 12 months</span>
          </div>
          <div className="trend-chart">
            {trend.map((m) => (
              <div className="trend-col" key={m.key} title={`${m.label}: ${m.n}`}>
                <span className="trend-bar" style={{ height: `${(m.n / trendMax) * 100}%` }}>{m.n > 0 && <b>{m.n}</b>}</span>
                <span className="trend-x">{m.label}</span>
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>Point-in-time counts are demo-seeded; the live counter tracks intake dates so BCAS can see load building month-on-month.</p>
        </section>

        <section className="card card-pad">
          <div className="card-head">
            <span className="section-title"><ClipboardCheck size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} /> Audit &amp; surprise checks <span className="badge-clause">§15</span></span>
            <span className="muted" style={{ fontSize: 12 }}>AEP Checking Committee</span>
          </div>
          <div className="audit-sample">
            <div className="as-head"><span>Annual audit sample (20% of {population.toLocaleString()} holders)</span><b>{AUDITED_THIS_YEAR} / {sampleTarget.toLocaleString()}</b></div>
            <span className="rd-track"><span className="rd-fill" style={{ width: `${samplePct}%`, background: samplePct >= 60 ? "var(--green-700)" : "var(--amber-500)" }} /></span>
            <span className="muted" style={{ fontSize: 11.5 }}>{samplePct}% of the mandated annual sample audited year-to-date.</span>
          </div>
          <div className="card-head" style={{ marginTop: 18 }}><span className="section-title">Monthly surprise checks</span><span className="muted" style={{ fontSize: 12 }}>checks · findings</span></div>
          <div className="trend-chart surprise">
            {SURPRISE_CHECKS.map((c) => (
              <div className="trend-col" key={c.m} title={`${c.m}: ${c.checks} checks, ${c.findings} findings`}>
                <span className="trend-bar" style={{ height: `${(c.checks / surpriseMax) * 100}%`, background: c.findings > 0 ? "var(--amber-500)" : "var(--navy-500)" }}><b>{c.checks}</b></span>
                <span className="trend-x">{c.m}</span>
                {c.findings > 0 && <span className="surprise-find">{c.findings}⚠</span>}
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card card-pad">
        <div className="card-head"><span className="section-title"><ShieldCheck size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} /> Entity compliance scorecard</span></div>
        <div className="matrix-scroll">
          <table className="sur-table">
            <thead><tr><th>Entity</th><th>Category</th><th>Status</th>{ENTITY_DOCS.map((d) => <th key={d}>{d}</th>)}<th>Verdict</th></tr></thead>
            <tbody>
              {entityCompliance.map(({ e, compliant }) => (
                <tr key={e.id}>
                  <td><b>{e.name}</b></td><td className="muted">{e.category}</td>
                  <td><Pill tone={e.status === "active" ? "green" : "amber"} dot>{e.status}</Pill></td>
                  {ENTITY_DOCS.map((d) => { const s = docStatus(e.id, d); return <td key={d}><span className={`doc-stat tone-${s === "ok" ? "green" : s === "pending" ? "amber" : "red"}`}>{s}</span></td>; })}
                  <td><Pill tone={compliant ? "green" : "red"} dot>{compliant ? "compliant" : "non-compliant"}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

type EC = { e: import("@/domain/types").Entity; expired: number; pending: number };

/** Drill-down panel — reveals the records behind a clicked KPI tile, with the
 *  calculation that produced the number. */
function ComplianceDrill(props: {
  drill: string; onClose: () => void; entities: import("@/domain/types").Entity[];
  complianceRate: number; compliantCount: number; entityTotal: number;
  nonCompliant: EC[]; exp30List: Application[]; heldList: Application[];
  withdrawnList: Application[]; atRiskList: Application[]; surrenderList: Application[];
  terminatedList: import("@/domain/types").Contract[];
}) {
  const { drill, onClose, entities } = props;
  const nm = (id: string) => entityName(id, entities);

  const AppTable = ({ rows, note }: { rows: Application[]; note?: string }) => (
    <>
      <div className="matrix-scroll">
        <table className="sur-table">
          <thead><tr><th>Pass</th><th>Holder / item</th><th>Pillar</th><th>Entity</th><th>Status</th><th>Valid to</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="mono"><Link to={`/app/applications/${a.id}`}>{a.id}</Link></td>
                <td><b>{a.subject}</b></td>
                <td><PillarBadge pillar={a.pillar} /> <span className="mono">{a.passType}</span></td>
                <td className="muted">{nm(a.entityId)}</td>
                <td><Pill tone={STATUS_META[a.status].tone} dot>{STATUS_META[a.status].label}</Pill></td>
                <td className="mono">{a.expiryDate || a.validTo || "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="reg-empty muted">Nothing in this bucket.</td></tr>}
          </tbody>
        </table>
      </div>
      {note && <p className="muted" style={{ fontSize: 12, padding: "10px 16px 0" }}>{note}</p>}
    </>
  );

  const MAP: Record<string, { title: string; calc: string; body: JSX.Element }> = {
    rate: {
      title: "Entity compliance rate — how it's calculated",
      calc: `compliant ÷ total entities = ${props.compliantCount} ÷ ${props.entityTotal} = ${props.complianceRate}%. An entity counts as compliant only when it is active AND has no expired mandatory document (Security Programme, Clearance, AOP/NSOP, NCASP, Contract).`,
      body: (
        <div className="matrix-scroll">
          <table className="sur-table">
            <thead><tr><th>Entity</th><th>Status</th><th>Expired docs</th><th>Pending docs</th><th>Verdict</th></tr></thead>
            <tbody>
              {entities.map((e) => {
                const nc = props.nonCompliant.find((x) => x.e.id === e.id);
                const ok = !nc;
                return (
                  <tr key={e.id}>
                    <td><b>{e.name}</b></td>
                    <td><Pill tone={e.status === "active" ? "green" : "amber"} dot>{e.status}</Pill></td>
                    <td>{nc?.expired ?? 0}</td><td>{nc?.pending ?? 0}</td>
                    <td><Pill tone={ok ? "green" : "red"} dot>{ok ? "compliant" : "non-compliant"}</Pill></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ),
    },
    noncompliant: {
      title: "Non-compliant entities",
      calc: `Entities that are suspended/archived OR hold ≥ 1 expired mandatory document. Count = ${props.nonCompliant.length}.`,
      body: (
        <div className="register">
          {props.nonCompliant.map(({ e, expired, pending }) => (
            <div className="reg-row nc-row" key={e.id}>
              <span className="reg-subject">{e.name}</span><span className="muted">{e.category}</span>
              <Pill tone={e.status === "active" ? "amber" : "red"} dot>{e.status}</Pill>
              {expired > 0 && <Pill tone="red">{expired} expired</Pill>}
              {pending > 0 && <Pill tone="amber">{pending} pending</Pill>}
            </div>
          ))}
          {props.nonCompliant.length === 0 && <div className="reg-empty muted">All entities compliant.</div>}
        </div>
      ),
    },
    exp30: { title: "Passes expiring within 30 days", calc: `Issued passes whose valid-to / expiry date is within 30 days of today. Renew from day 30. Count = ${props.exp30List.length}.`, body: <AppTable rows={props.exp30List} /> },
    held: { title: "Parked / deactivated passes", calc: `Issued passes on a reversible hold — Parked (§10.6, 60-day non-use) or Deactivated (compliance hold, e.g. AVSEC lapse §13). Count = ${props.heldList.length}.`, body: <AppTable rows={props.heldList} /> },
    withdrawn: { title: "Withdrawn passes (§11)", calc: `Passes permanently cancelled on adverse BGC / disciplinary action. Holder is Stop-Listed. Count = ${props.withdrawnList.length}.`, body: <AppTable rows={props.withdrawnList} /> },
    atrisk: { title: "SLA at risk — in clarification", calc: `In-flight applications returned to the clarification queue; the processing SLA clock keeps running. Count = ${props.atRiskList.length}.`, body: <AppTable rows={props.atRiskList} /> },
    surrender: { title: "Surrendered / late", calc: `Passes surrendered (voluntary return) or moved to surrender via termination. Late = not returned within 7 days of exit (§10.7). Count = ${props.surrenderList.length}.`, body: <AppTable rows={props.surrenderList} note="Late-surrender penalties are tracked on the Surrenders & penalties page." /> },
    terminated: {
      title: "Terminated contracts",
      calc: `Contracts ended early; their passes cascade to surrender and all parties are intimated (§10.3). Count = ${props.terminatedList.length}.`,
      body: (
        <div className="register">
          {props.terminatedList.map((c) => (
            <div className="reg-row" key={c.id}>
              <span className="mono reg-id">{c.id}</span><span className="reg-subject">{c.counterparty}</span>
              <span className="muted">{nm(c.entityId)}</span><Pill tone="red" dot>{c.status}</Pill>
            </div>
          ))}
          {props.terminatedList.length === 0 && <div className="reg-empty muted">No terminated contracts.</div>}
        </div>
      ),
    },
  };

  const d = MAP[drill];
  if (!d) return null;
  return (
    <section className="card drill-panel">
      <div className="card-head card-pad" style={{ paddingBottom: 8 }}>
        <span className="section-title">{d.title}</span>
        <button className="btn btn-ghost mini-btn" onClick={onClose}><X size={14} /> Close</button>
      </div>
      <div className="drill-calc"><b>Calculation:</b> {d.calc}</div>
      {d.body}
    </section>
  );
}
