import { useMemo } from "react";
import { ShieldCheck, ShieldAlert, TimerReset, Ban, Gauge, PauseCircle, TrendingUp, ClipboardCheck } from "lucide-react";
import { useData } from "@/app/data";
import { expiringWithin } from "@/lib/api";
import { SURPRISE_CHECKS, AUDITED_THIS_YEAR } from "@/lib/demoData";
import { Pill } from "@/components/ui";

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

  const exp30 = expiringWithin(applications, 30).length;
  const exp14 = expiringWithin(applications, 14).length;
  const exp3 = expiringWithin(applications, 3).length;
  // SLA is the processing-turnaround metric — only in-flight applications count.
  // Post-issue lifecycle holds (parked / deactivated) and cancellations
  // (withdrawn) are governance states, surfaced on their own tiles.
  const atRisk = applications.filter((a) => a.status === "clarification").length;
  const held = applications.filter((a) => a.status === "parked" || a.status === "deactivated").length;
  const withdrawn = applications.filter((a) => a.status === "withdrawn").length;
  const overdueSurrender = applications.filter((a) => a.status === "surrendered").length;
  const terminatedContracts = contracts.filter((c) => c.status === "terminated").length;

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
        <div className="card kpi" style={{ ["--kpi-accent" as string]: complianceRate >= 80 ? "var(--green-700)" : "var(--amber-500)" }}>
          <div className="kpi-row"><span className="kpi-icon" style={{ background: complianceRate >= 80 ? "var(--green-700)" : "var(--amber-500)" }}><Gauge size={18} /></span><span className="kpi-value">{complianceRate}%</span></div>
          <div className="kpi-label">Entity compliance rate</div>
        </div>
        <div className="card kpi" style={{ ["--kpi-accent" as string]: "var(--red-500)" }}>
          <div className="kpi-row"><span className="kpi-icon" style={{ background: "var(--red-500)" }}><ShieldAlert size={18} /></span><span className="kpi-value">{nonCompliant.length}</span></div>
          <div className="kpi-label">Non-compliant entities</div>
        </div>
        <div className="card kpi" style={{ ["--kpi-accent" as string]: "var(--amber-500)" }}>
          <div className="kpi-row"><span className="kpi-icon" style={{ background: "var(--amber-500)" }}><TimerReset size={18} /></span><span className="kpi-value">{exp30}</span></div>
          <div className="kpi-label">Passes expiring ≤ 30d</div>
        </div>
        <div className="card kpi" style={{ ["--kpi-accent" as string]: "var(--amber-500)" }}>
          <div className="kpi-row"><span className="kpi-icon" style={{ background: "var(--amber-500)" }}><PauseCircle size={18} /></span><span className="kpi-value">{held}</span></div>
          <div className="kpi-label">Parked / deactivated</div>
        </div>
        <div className="card kpi" style={{ ["--kpi-accent" as string]: "var(--red-500)" }}>
          <div className="kpi-row"><span className="kpi-icon" style={{ background: "var(--red-500)" }}><Ban size={18} /></span><span className="kpi-value">{withdrawn}</span></div>
          <div className="kpi-label">Withdrawn (§11)</div>
        </div>
        <div className="card kpi" style={{ ["--kpi-accent" as string]: "var(--amber-500)" }}>
          <div className="kpi-row"><span className="kpi-icon" style={{ background: "var(--amber-500)" }}><ShieldAlert size={18} /></span><span className="kpi-value">{atRisk}</span></div>
          <div className="kpi-label">SLA at risk (clarification)</div>
        </div>
        <div className="card kpi" style={{ ["--kpi-accent" as string]: "var(--ink-400)" }}>
          <div className="kpi-row"><span className="kpi-icon" style={{ background: "var(--ink-400)" }}><Ban size={18} /></span><span className="kpi-value">{overdueSurrender}</span></div>
          <div className="kpi-label">Surrendered / late</div>
        </div>
        <div className="card kpi" style={{ ["--kpi-accent" as string]: "var(--red-500)" }}>
          <div className="kpi-row"><span className="kpi-icon" style={{ background: "var(--red-500)" }}><Ban size={18} /></span><span className="kpi-value">{terminatedContracts}</span></div>
          <div className="kpi-label">Terminated contracts</div>
        </div>
      </div>

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
