import type { Application, Entity, Pillar } from "@/domain/types";
import { STATE_ORDER } from "@/domain/status";
import { APPLICATIONS, ENTITIES, INDIVIDUALS, COMMITTEES, SURRENDERS, AUDIT } from "./demoData";

// ---------------------------------------------------------------------------
// Data access facade. Today it resolves against the in-memory demo dataset so
// the app renders standalone on Netlify. To go live, point these functions at
// the FastAPI backend (VITE_API_URL) — the component layer never changes.
// ---------------------------------------------------------------------------

const delay = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));

export const api = {
  listEntities: () => delay(ENTITIES),
  getEntity: (id: string) => delay(ENTITIES.find((e) => e.id === id) ?? null),
  listIndividuals: () => delay(INDIVIDUALS),
  listApplications: () => delay(APPLICATIONS),
  listCommittees: () => delay(COMMITTEES),
  listSurrenders: () => delay(SURRENDERS),
  listAudit: () => delay(AUDIT),
};

// --- Derived dashboard selectors (pure, so they are trivially testable) -----

export function entityName(id: string, entities: Entity[]): string {
  return entities.find((e) => e.id === id)?.name ?? id;
}

export function stateCounts(apps: Application[]): { key: string; label: string; count: number }[] {
  return STATE_ORDER.map((s) => ({
    key: s,
    label: s.replace("_", "-"),
    count: apps.filter((a) => a.status === s).length,
  }));
}

export function pillarMix(apps: Application[]): { pillar: Pillar; count: number }[] {
  const order: Pillar[] = ["MAN", "MATERIAL", "VEHICLE"];
  return order.map((p) => ({ pillar: p, count: apps.filter((a) => a.pillar === p).length }));
}

export function expiringWithin(apps: Application[], days: number, from = new Date()): Application[] {
  const limit = new Date(from);
  limit.setDate(limit.getDate() + days);
  return apps.filter((a) => {
    if (!a.expiryDate) return false;
    const d = new Date(a.expiryDate);
    return d >= from && d <= limit;
  });
}
