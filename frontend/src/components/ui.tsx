import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Pillar } from "@/domain/types";
import { PILLAR_TONE } from "@/domain/status";

export function Pill({ tone, children, dot }: { tone: string; children: ReactNode; dot?: boolean }) {
  return <span className={`pill tone-${tone} ${dot ? "pill-dot" : ""}`}>{children}</span>;
}

export function PillarBadge({ pillar }: { pillar: Pillar }) {
  return <Pill tone={PILLAR_TONE[pillar]}>{pillar}</Pill>;
}

export function ClauseBadge({ children }: { children: ReactNode }) {
  return <span className="badge-clause">{children}</span>;
}

export function KpiTile({
  icon, label, value, accent, delta, hint,
}: {
  icon: ReactNode; label: string; value: ReactNode; accent: string;
  delta?: { dir: "up" | "down"; text: string }; hint?: string;
}) {
  return (
    <div className="card kpi" style={{ ["--kpi-accent" as string]: accent }}>
      <div className="kpi-row">
        <span className="kpi-icon" style={{ background: accent }}>{icon}</span>
        <span className="kpi-value">{value}</span>
        {delta && (
          <span className={`kpi-delta ${delta.dir === "up" ? "up" : "down"}`}>
            {delta.dir === "up" ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {delta.text}
          </span>
        )}
      </div>
      <div className="kpi-label">{label}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  );
}

export function ZoneChips({ codes }: { codes: string[] }) {
  if (!codes.length) return <span className="muted">—</span>;
  return (
    <span className="zone-chips">
      {codes.map((c) => (
        <span key={c} className="zone-chip mono">{c}</span>
      ))}
    </span>
  );
}
