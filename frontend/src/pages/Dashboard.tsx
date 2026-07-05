import { useEffect, useMemo, useState } from "react";
import { FileStack, Clock3, MessageSquareWarning, CalendarClock, TimerReset, Ban, AlertTriangle } from "lucide-react";
import { useAuth } from "@/app/auth";
import { ROLE_LABEL } from "@/domain/roles";
import type { Application, Entity } from "@/domain/types";
import { api, expiringWithin, pillarMix, stateCounts } from "@/lib/api";
import { KpiTile } from "@/components/ui";
import { PillarMixBars, StateBars } from "@/components/charts";
import ApplicationRegister from "@/components/ApplicationRegister";

export default function Dashboard() {
  const { session } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    api.listApplications().then(setApps);
    api.listEntities().then(setEntities);
  }, []);

  // Scope to the signed-in entity for entity/individual roles.
  const scoped = useMemo(() => {
    if (!session) return [];
    if (session.role === "entity" || session.role === "individual" || session.role === "others") {
      return apps.filter((a) => a.entityId === session.entityId);
    }
    return apps;
  }, [apps, session]);

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

      <div className="kpi-grid">
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
