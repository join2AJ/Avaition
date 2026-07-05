import type { Pillar } from "@/domain/types";
import { PILLARS } from "@/domain/types";

const TONE_VAR: Record<string, string> = {
  blue: "var(--brand)", amber: "var(--amber-d)", teal: "var(--teal)",
  green: "var(--green)", red: "var(--red)", violet: "var(--violet)", slate: "var(--slate)",
};

/** Vertical bar chart — "Applications by state". */
export function StateBars({
  data, onSelect, selected,
}: {
  data: { key: string; label: string; count: number }[];
  onSelect?: (key: string) => void; selected?: string | null;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const tones = ["blue", "amber", "violet", "green", "ink", "red"];
  return (
    <div className="statebars">
      {data.map((d, i) => {
        const tone = tones[i % tones.length];
        const active = selected === d.key;
        return (
          <button
            key={d.key}
            className={`statebar ${active ? "active" : ""}`}
            onClick={() => onSelect?.(d.key)}
            title={`${d.label}: ${d.count}`}
          >
            <span className="statebar-count">{d.count}</span>
            <span
              className="statebar-fill"
              style={{
                height: `${(d.count / max) * 100}%`,
                background: tone === "ink" ? "var(--ink)" : TONE_VAR[tone],
              }}
            />
            <span className="statebar-label">{d.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Horizontal bars — "Pillar mix" MAN / MATERIAL / VEHICLE. */
export function PillarMixBars({ data }: { data: { pillar: Pillar; count: number }[] }) {
  const total = Math.max(1, data.reduce((s, d) => s + d.count, 0));
  const color: Record<Pillar, string> = {
    MAN: "var(--pillar-man)", MATERIAL: "var(--pillar-material)", VEHICLE: "var(--pillar-vehicle)",
  };
  return (
    <div className="pmix">
      {data.map((d) => {
        const meta = PILLARS.find((p) => p.key === d.pillar)!;
        return (
          <div className="pmix-row" key={d.pillar}>
            <span className="pmix-label">
              <b>{d.pillar}</b> <span className="muted mono">{meta.pass}</span>
            </span>
            <span className="pmix-track">
              <span className="pmix-fill" style={{ width: `${(d.count / total) * 100}%`, background: color[d.pillar] }} />
            </span>
            <span className="pmix-count">{d.count}</span>
          </div>
        );
      })}
    </div>
  );
}
