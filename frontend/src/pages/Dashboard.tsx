import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileStack, Clock3, MessageSquareWarning, CalendarClock, TimerReset, Ban, AlertTriangle, Radio } from "lucide-react";
import { useAuth } from "@/app/auth";
import { useSettings, visiblePillars } from "@/app/settings";
import { useData } from "@/app/data";
import { ROLE_LABEL } from "@/domain/roles";
import { expiringWithin, pillarMix, stateCounts } from "@/lib/api";
import { slaHealth } from "@/domain/sla";
import { KpiTile } from "@/components/ui";
import { PillarMixBars, StateBars } from "@/components/charts";
import ApplicationRegister from "@/components/ApplicationRegister";

export default function Dashboard() {
  const { session } = useAuth();
  const { policy } = useSettings();
  const { applications: apps, entities, audit } = useData();
  const nav = useNavigate();
  const [filter, setFilter] = useState<string | null>(null);

  const scoped = useMemo(() => {
    if (!session) return [];
    const allowed = visiblePillars(session.role, policy);
    let list = apps.filter((a) => allowed.includes(a.pillar));
    if (session.role === "entity" || session.role === "individual" || session.role === "others") {
      list = list.filter((a) => a.entityId === session.entityId);
    }
    return list;
  }, [apps, session, policy]);

  const states = stateCounts(scoped);
  const mix = pillarMix(scoped);
  const shown = filter ? scoped.filter((a) => a.status === filter) : scoped;

  const suspended = entities.filter((e) => e.status !== "active").length;
  const expiring = expiringWithin(scoped, 30).length;

  // Real SLA health (replaces the old fabricated "readiness" score).
  const sla = { on_track: 0, at_risk: 0, breached: 0 } as Record<string, number>;
  scoped.forEach((a) => { sla[slaHealth(a.status)]++; });
  const slaTotal = Math.max(1, scoped.length);

  const go = (qs: string) => nav(`/app/applications?${qs}`);

  const tiles = [
    { icon: <FileStack size={18} />, label: "Applications (scope)", value: scoped.length, accent: "var(--brand)", to: "" },
    { icon: <Clock3 size={18} />, label: "Checklist pending", value: states.find((s) => s.key === "checklist_pending")?.count ?? 0, accent: "var(--teal)", to: "stage=checklist_pending" },
    { icon: <MessageSquareWarning size={18} />, label: "Sent for clarification", value: states.find((s) => s.key === "clarification")?.count ?? 0, accent: "var(--amber-d)", to: "stage=clarification" },
    { icon: <CalendarClock size={18} />, label: "Committee-scheduled", value: states.find((s) => s.key === "committee_scheduled")?.count ?? 0, accent: "var(--violet)", to: "stage=committee_scheduled" },
    { icon: <TimerReset size={18} />, label: "Expiring ≤ 30 days", value: expiring, accent: "var(--green)", to: "" },
    { icon: <Ban size={18} />, label: "Suspended / archived", value: suspended, accent: "var(--red)", to: "" },
    { icon: <AlertTriangle size={18} />, label: "Late surrenders", value: 2, accent: "var(--red)", to: "" },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Dashboard</h2>
          <p className="muted">{ROLE_LABEL[session!.role]} — live counts across your scope. Click any tile, bar or row to drill in. All times in IST.</p>
        </div>
        <span className="pill tone-green pill-dot">Audit trail on</span>
      </div>

      <div className="kpi-grid stagger">
        {tiles.map((t) => (
          <div key={t.label} onClick={() => t.to !== undefined && go(t.to)} className="kpi-link">
            <KpiTile icon={t.icon} label={t.label} value={t.value} accent={t.accent} />
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <section className="card card-pad">
          <div className="card-head">
            <span className="section-title">Applications by stage</span>
            <span className="muted" style={{ fontSize: 12 }}>How many passes sit at each step — click a bar to filter below</span>
          </div>
          <StateBars data={states} selected={filter} onSelect={(k) => setFilter((f) => (f === k ? null : k))} />
        </section>

        <section className="card card-pad">
          <div className="card-head">
            <span className="section-title">Passes by pillar</span>
            <span className="muted" style={{ fontSize: 12 }}>Man · Material · Vehicle — click to open that pillar</span>
          </div>
          <PillarMixBars data={mix} onSelect={(p) => go(`pillar=${p}`)} />
          <p className="muted pmix-note">The three families of passes off one entity registration. Click a bar to see them in Applications, where you can filter by zone, stage and date.</p>
        </section>
      </div>

      <div className="dash-grid">
        <section className="card card-pad">
          <div className="card-head">
            <span className="section-title">SLA health</span>
            <span className="muted" style={{ fontSize: 12 }}>Tracking against §8.3.3.11 processing SLAs</span>
          </div>
          <div className="readiness-bars">
            {[
              { label: "On track", n: sla.on_track, tone: "var(--green-700)" },
              { label: "At risk", n: sla.at_risk, tone: "var(--amber-500)" },
              { label: "Breached", n: sla.breached, tone: "var(--red-500)" },
            ].map((r) => (
              <div className="rd-row" key={r.label}>
                <span className="rd-label">{r.label}</span>
                <span className="rd-track"><span className="rd-fill" style={{ width: `${(r.n / slaTotal) * 100}%`, background: r.tone }} /></span>
                <span className="rd-pct">{r.n}</span>
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 11.5, marginTop: 12 }}>A breached SLA requires a written justification on the pass (recorded &amp; audit-logged).</p>
        </section>

        <section className="card audit-card">
          <div className="audit-head"><Radio size={13} /> AUDIT · TRAIL <span className="audit-live">live</span></div>
          <div className="audit-log mono">
            {audit.slice(0, 7).map((e, i) => (
              <div className="audit-line" key={i}>
                <span className="audit-t">{e.ts.slice(11) || e.ts}</span>
                <span className={`audit-msg ${e.tone}`}>{e.actor}: {e.action} {e.object} — {e.detail}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-head card-pad" style={{ paddingBottom: 0 }}>
          <span className="section-title">Application register {filter && <span className="muted">· stage: {filter.replace("_", "-")}</span>}</span>
          <span className="pill tone-slate">Scoped to role</span>
        </div>
        <ApplicationRegister apps={shown} entities={entities} showTime />
      </section>
    </div>
  );
}
