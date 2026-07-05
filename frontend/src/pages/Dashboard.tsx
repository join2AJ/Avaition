import { useMemo, useState } from "react";
import { FileStack, Clock3, MessageSquareWarning, CalendarClock, TimerReset, Ban, AlertTriangle, Radio } from "lucide-react";
import { useAuth } from "@/app/auth";
import { useSettings, visiblePillars } from "@/app/settings";
import { useData } from "@/app/data";
import { ROLE_LABEL } from "@/domain/roles";
import { expiringWithin, pillarMix, stateCounts } from "@/lib/api";
import { KpiTile } from "@/components/ui";
import { PillarMixBars, StateBars } from "@/components/charts";
import ApplicationRegister from "@/components/ApplicationRegister";

export default function Dashboard() {
  const { session } = useAuth();
  const { policy } = useSettings();
  const { applications: apps, entities } = useData();
  const [filter, setFilter] = useState<string | null>(null);

  // Scope by role: entity/individual/others see only their own entity; BCAS is
  // limited to the pass pillars Admin has granted (default Man + Vehicle).
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

  const tiles = [
    { icon: <FileStack size={18} />, label: "Applications (scope)", value: scoped.length, accent: "var(--brand)", delta: { dir: "up" as const, text: "+4 w-o-w" } },
    { icon: <Clock3 size={18} />, label: "Checklist pending", value: states.find((s) => s.key === "checklist_pending")?.count ?? 0, accent: "var(--teal)" },
    { icon: <MessageSquareWarning size={18} />, label: "Sent for clarification", value: states.find((s) => s.key === "clarification")?.count ?? 0, accent: "var(--amber-d)" },
    { icon: <CalendarClock size={18} />, label: "Committee-scheduled", value: states.find((s) => s.key === "committee_scheduled")?.count ?? 0, accent: "var(--violet)" },
    { icon: <TimerReset size={18} />, label: "Expiring ≤ 30 days", value: expiring, accent: "var(--green)" },
    { icon: <Ban size={18} />, label: "Suspended / archived", value: suspended, accent: "var(--red)" },
    { icon: <AlertTriangle size={18} />, label: "Late surrenders", value: 2, accent: "var(--red)" },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Flight deck</h2>
          <p className="muted">{ROLE_LABEL[session!.role]} — every mandatory field & gate carries its governing clause.</p>
        </div>
        <span className="pill tone-green pill-dot">Audit trail on</span>
      </div>

      <div className="kpi-grid stagger">
        {tiles.map((t) => <KpiTile key={t.label} {...t} />)}
      </div>

      <div className="dash-grid">
        <section className="card card-pad">
          <div className="card-head">
            <span className="section-title">Applications by state</span>
            <span className="muted" style={{ fontSize: 12 }}>Click a bar to filter the register</span>
          </div>
          <StateBars data={states} selected={filter} onSelect={(k) => setFilter((f) => (f === k ? null : k))} />
        </section>

        <section className="card card-pad">
          <div className="card-head">
            <span className="section-title">Pillar mix</span>
            <span className="muted" style={{ fontSize: 12 }}>MAN · MATERIAL · VEHICLE</span>
          </div>
          <PillarMixBars data={mix} />
          <p className="muted pmix-note">One entity registration feeds all three pillars — Man&nbsp;[§5·§10·§11] · Material&nbsp;[§12B] · Vehicle&nbsp;[§12A].</p>
        </section>
      </div>

      <div className="dash-grid">
        <section className="card card-pad">
          <div className="card-head">
            <span className="section-title">Airport readiness</span>
            <span className="pill tone-green pill-dot">On track</span>
          </div>
          <div className="readiness-head">
            <span className="serif readiness-score">87<small>%</small></span>
            <span className="muted" style={{ fontSize: 12 }}>SLA-weighted posture across all pillars</span>
          </div>
          <div className="readiness-bars">
            {[
              { label: "MAN · AEP turnaround", pct: 88, tone: "var(--green-700)" },
              { label: "MATERIAL · ToT", pct: 74, tone: "var(--amber-500)" },
              { label: "VEHICLE · VEP", pct: 95, tone: "var(--green-700)" },
            ].map((r) => (
              <div className="rd-row" key={r.label}>
                <span className="rd-label">{r.label}</span>
                <span className="rd-track"><span className="rd-fill" style={{ width: `${r.pct}%`, background: r.tone }} /></span>
                <span className="rd-pct">{r.pct}%</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card audit-card">
          <div className="audit-head"><Radio size={13} /> AUDIT · TRAIL</div>
          <div className="audit-log mono">
            {[
              ["09:41Z", "AEP register synced — 2,140 holders", "ok"],
              ["10:14Z", "ToT card TOT-0912 issued · zone P", "ok"],
              ["11:02Z", "APP-2240 sent to clarification · SLA 2 WD", "warn"],
              ["11:30Z", "Committee scheduled · fortnightly cadence", "ok"],
              ["11:47Z", "APP-2244 late-surrender flag raised", "bad"],
              ["12:03Z", "Auto-scan complete · 11 applications", "ok"],
            ].map(([t, msg, tone]) => (
              <div className="audit-line" key={t as string}>
                <span className="audit-t">{t}</span>
                <span className={`audit-msg ${tone}`}>{msg}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-head card-pad" style={{ paddingBottom: 0 }}>
          <span className="section-title">Application register {filter && <span className="muted">· filtered: {filter.replace("_", "-")}</span>}</span>
          <span className="pill tone-slate">Scoped to role</span>
        </div>
        <ApplicationRegister apps={shown} entities={entities} />
      </section>
    </div>
  );
}
