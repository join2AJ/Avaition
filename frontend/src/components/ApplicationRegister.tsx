import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { Application, Entity } from "@/domain/types";
import { STATUS_META } from "@/domain/status";
import { entityName } from "@/lib/api";
import { Pill, PillarBadge, ZoneChips } from "./ui";

export default function ApplicationRegister({
  apps, entities, limit, linkBase = "/app/applications", showTime = false,
}: {
  apps: Application[]; entities: Entity[]; limit?: number; linkBase?: string; showTime?: boolean;
}) {
  const rows = limit ? apps.slice(0, limit) : apps;
  return (
    <div className="register">
      {rows.map((a) => {
        const st = STATUS_META[a.status];
        return (
          <Link to={`${linkBase}/${a.id}`} key={a.id} className="reg-row">
            <span className="reg-id-cell">
              <span className="reg-id mono">{a.id}</span>
              {showTime && <span className="reg-time mono">{a.createdAtTs ?? a.createdAt}</span>}
            </span>
            <PillarBadge pillar={a.pillar} />
            <span className="reg-subject">{a.subject}</span>
            <span className="reg-entity muted">{entityName(a.entityId, entities)}</span>
            <span className="reg-pass mono">{a.passType}</span>
            <span className="reg-zones"><ZoneChips codes={a.zones} /></span>
            <span className="reg-status"><Pill tone={st.tone} dot>{st.label}</Pill></span>
            <ChevronRight size={16} className="muted reg-chev" />
          </Link>
        );
      })}
      {rows.length === 0 && <div className="reg-empty muted">No applications match these filters.</div>}
    </div>
  );
}
