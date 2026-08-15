import type { Application, Pillar } from "./types";

// Shared application filter — drives the Applications tabs, the dashboard
// "Passes by pillar" counter, and the global search. Every field is optional
// so the same shape powers "select MAN + P zone", "requested between dates", etc.
export interface AppFilter {
  pillar?: Pillar | "ALL";
  zone?: string;       // single zone code, e.g. "P"
  stage?: string;      // application status
  passType?: string;
  from?: string;       // created/requested on or after (yyyy-mm-dd)
  to?: string;         // created/requested on or before
  q?: string;          // free text over id / subject / entity
}

export function applyFilter(apps: Application[], f: AppFilter, entityName: (id: string) => string): Application[] {
  return apps.filter((a) => {
    if (f.pillar && f.pillar !== "ALL" && a.pillar !== f.pillar) return false;
    if (f.zone && !a.zones.includes(f.zone)) return false;
    if (f.stage && a.status !== f.stage) return false;
    if (f.passType && a.passType !== f.passType) return false;
    if (f.from && a.createdAt < f.from) return false;
    if (f.to && a.createdAt > f.to) return false;
    if (f.q) {
      const n = f.q.toLowerCase();
      const hay = `${a.id} ${a.subject} ${entityName(a.entityId)} ${a.passType} ${a.zones.join(" ")}`.toLowerCase();
      if (!hay.includes(n)) return false;
    }
    return true;
  });
}
