import { createContext, useContext, useState, type ReactNode } from "react";
import type { Pillar } from "@/domain/types";

// Admin-configurable access policy. BCAS oversight is, by default, scoped to
// MAN and VEHICLE passes only — MATERIAL (ToT) is off until Admin enables it.
// CISF is search-only and always spans all pillars (verification, not review).
export interface AccessPolicy {
  bcasPillars: Pillar[];
}

const DEFAULT: AccessPolicy = { bcasPillars: ["MAN", "VEHICLE"] };

const SettingsCtx = createContext<{
  policy: AccessPolicy;
  setBcasPillar: (p: Pillar, on: boolean) => void;
}>({ policy: DEFAULT, setBcasPillar: () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [policy, setPolicy] = useState<AccessPolicy>(() => {
    const raw = localStorage.getItem("aep-access-policy");
    return raw ? (JSON.parse(raw) as AccessPolicy) : DEFAULT;
  });
  const persist = (next: AccessPolicy) => {
    setPolicy(next);
    localStorage.setItem("aep-access-policy", JSON.stringify(next));
  };
  const setBcasPillar = (p: Pillar, on: boolean) => {
    const set = new Set(policy.bcasPillars);
    on ? set.add(p) : set.delete(p);
    persist({ ...policy, bcasPillars: Array.from(set) });
  };
  return <SettingsCtx.Provider value={{ policy, setBcasPillar }}>{children}</SettingsCtx.Provider>;
}

export const useSettings = () => useContext(SettingsCtx);

/** Which pillars a session may view. */
export function visiblePillars(role: string, policy: AccessPolicy): Pillar[] {
  if (role === "bcas") return policy.bcasPillars;
  return ["MAN", "MATERIAL", "VEHICLE"];
}
