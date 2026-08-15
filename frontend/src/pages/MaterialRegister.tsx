import { useMemo, useState } from "react";
import { Boxes, PackagePlus, ArrowDownToLine, ArrowUpFromLine, Flame, ClipboardList, AlertTriangle } from "lucide-react";
import { useAuth } from "@/app/auth";
import { useData } from "@/app/data";
import { Pill } from "@/components/ui";
import type { NewMaterial } from "@/app/data";

const TYPES = ["tool", "equipment", "food", "consumable", "chemical", "spare"];
const CATEGORIES = ["A", "B", "C", "D", "E", "F", "G"];
const UNITS = ["nos", "kg", "litre", "box", "metre"];
const GATES = ["G3", "G5", "G7", "CARGO-1", "CARGO-2"];

type Dir = "in" | "consumed" | "out";
const DIR_META: Record<Dir, { label: string; tone: "green" | "amber" | "red"; icon: typeof ArrowDownToLine }> = {
  in: { label: "IN", tone: "green", icon: ArrowDownToLine },
  out: { label: "OUT", tone: "red", icon: ArrowUpFromLine },
  consumed: { label: "CONSUMED", tone: "amber", icon: Flame },
};

export default function MaterialRegister() {
  const { session } = useAuth();
  const { materials, materialMoves, createMaterial, recordMaterialMove, entities } = useData();
  const scoped = ["entity", "others", "individual"].includes(session!.role);
  const myEntity = session!.entityId;

  const mats = useMemo(
    () => (scoped ? materials.filter((m) => m.entityId === myEntity) : materials),
    [materials, scoped, myEntity],
  );
  const moves = useMemo(
    () => (scoped ? materialMoves.filter((m) => m.entityId === myEntity) : materialMoves),
    [materialMoves, scoped, myEntity],
  );

  const stat = (code: string) => {
    const ms = moves.filter((m) => m.code === code);
    const sum = (d: Dir) => ms.filter((m) => m.direction === d).reduce((s, m) => s + m.quantity, 0);
    const inQ = sum("in"), consumedQ = sum("consumed"), outQ = sum("out");
    return { inQ, consumedQ, outQ, inside: inQ - consumedQ - outQ, timesIn: ms.filter((m) => m.direction === "in").length };
  };

  const [tab, setTab] = useState<"catalogue" | "ledger">("catalogue");

  return (
    <div className="page mat-page">
      <div className="page-head">
        <div>
          <h2><Boxes size={20} style={{ verticalAlign: "-4px", marginRight: 8 }} />Material register <span className="muted" style={{ fontWeight: 400 }}>· ToT</span></h2>
          <p className="muted">Track every item {scoped ? "your agency" : "each agency"} takes into the terminal, consumes inside, and takes out — by code, gate, carrier and count. Each item is assigned a code; consumption must be declared.</p>
        </div>
      </div>

      <div className="mat-tiles">
        <Tile label="Items registered" value={mats.length} />
        <Tile label="Currently inside" value={mats.filter((m) => stat(m.code).inside > 0).length} accent="#15803d" />
        <Tile label="Movements logged" value={moves.length} />
        <Tile label="Consumed events" value={moves.filter((m) => m.direction === "consumed").length} accent="#b45309" />
      </div>

      <div className="db-viewtabs">
        <button className={`db-vtab ${tab === "catalogue" ? "on" : ""}`} onClick={() => setTab("catalogue")}><PackagePlus size={14} /> Catalogue</button>
        <button className={`db-vtab ${tab === "ledger" ? "on" : ""}`} onClick={() => setTab("ledger")}><ClipboardList size={14} /> Movement ledger</button>
      </div>

      {tab === "catalogue" ? <Catalogue mats={mats} stat={stat} scoped={scoped} myEntity={myEntity} entities={entities} createMaterial={createMaterial} />
        : <Ledger mats={mats} moves={moves} scoped={scoped} myEntity={myEntity} recordMaterialMove={recordMaterialMove} />}
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="mat-tile card">
      <b style={accent ? { color: accent } : undefined}>{value}</b><span>{label}</span>
    </div>
  );
}

/* ---------------- Catalogue: register + list items ------------------------ */
function Catalogue({ mats, stat, scoped, myEntity, entities, createMaterial }: {
  mats: ReturnType<typeof useData>["materials"]; stat: (c: string) => { inside: number; timesIn: number };
  scoped: boolean; myEntity?: string; entities: ReturnType<typeof useData>["entities"];
  createMaterial: ReturnType<typeof useData>["createMaterial"];
}) {
  const [f, setF] = useState<NewMaterial>({
    name: "", type: "tool", category: "A", unit: "nos", weightKg: undefined, lengthCm: undefined, widthCm: undefined,
    heightCm: undefined, consumable: false, hazardous: false, entityId: myEntity ?? entities[0]?.id ?? "ENT-01",
  });
  const set = (patch: Partial<NewMaterial>) => setF((x) => ({ ...x, ...patch }));
  const add = () => {
    if (!f.name.trim()) return;
    createMaterial({ ...f, entityId: scoped ? (myEntity ?? f.entityId) : f.entityId });
    setF((x) => ({ ...x, name: "", weightKg: undefined, lengthCm: undefined, widthCm: undefined, heightCm: undefined, consumable: false, hazardous: false }));
  };
  const num = (v: number | undefined) => (v === undefined ? "" : String(v));

  return (
    <>
      <section className="card card-pad mat-form">
        <div className="mat-form-h"><PackagePlus size={15} /> Register a new material <span className="muted">— a MAT- code is assigned automatically</span></div>
        <div className="mat-grid">
          <label className="fld"><span className="fld-l">Item name</span><input className="field" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. AME toolkit" /></label>
          <label className="fld"><span className="fld-l">Type</span><select className="field" value={f.type} onChange={(e) => set({ type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label className="fld"><span className="fld-l">Annexure A–G</span><select className="field" value={f.category} onChange={(e) => set({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>Category {c}</option>)}</select></label>
          <label className="fld"><span className="fld-l">Unit</span><select className="field" value={f.unit} onChange={(e) => set({ unit: e.target.value })}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></label>
          <label className="fld"><span className="fld-l">Weight (kg)</span><input className="field" type="number" value={num(f.weightKg)} onChange={(e) => set({ weightKg: e.target.value ? +e.target.value : undefined })} /></label>
          <label className="fld"><span className="fld-l">L × W × H (cm)</span>
            <div className="mat-dims">
              <input className="field" type="number" placeholder="L" value={num(f.lengthCm)} onChange={(e) => set({ lengthCm: e.target.value ? +e.target.value : undefined })} />
              <input className="field" type="number" placeholder="W" value={num(f.widthCm)} onChange={(e) => set({ widthCm: e.target.value ? +e.target.value : undefined })} />
              <input className="field" type="number" placeholder="H" value={num(f.heightCm)} onChange={(e) => set({ heightCm: e.target.value ? +e.target.value : undefined })} />
            </div>
          </label>
          {!scoped && (
            <label className="fld"><span className="fld-l">Owning agency</span><select className="field" value={f.entityId} onChange={(e) => set({ entityId: e.target.value })}>{entities.map((en) => <option key={en.id} value={en.id}>{en.name}</option>)}</select></label>
          )}
          <label className="fld mat-check"><input type="checkbox" checked={f.consumable} onChange={(e) => set({ consumable: e.target.checked })} /> <span>Consumable (used inside)</span></label>
          <label className="fld mat-check"><input type="checkbox" checked={f.hazardous} onChange={(e) => set({ hazardous: e.target.checked })} /> <span>Hazardous / DG</span></label>
        </div>
        <button className="btn btn-brand" onClick={add} disabled={!f.name.trim()}><PackagePlus size={14} /> Register item</button>
      </section>

      <section className="card">
        <div className="mat-table-wrap">
          <table className="mat-table">
            <thead><tr><th>Code</th><th>Item</th><th>Type</th><th>Annexure</th><th>Weight</th><th>L×W×H</th><th>Inside</th><th>Times in</th></tr></thead>
            <tbody>
              {mats.length === 0 && <tr><td colSpan={8} className="muted" style={{ padding: 18 }}>No materials registered yet.</td></tr>}
              {mats.map((m) => {
                const s = stat(m.code);
                return (
                  <tr key={m.code}>
                    <td><code className="mat-code">{m.code}</code></td>
                    <td>{m.name}{m.hazardous && <span className="mat-haz" title="Hazardous"> ⚠</span>}{m.consumable && <span className="muted mono" style={{ fontSize: 10 }}> · consumable</span>}</td>
                    <td className="mono">{m.type}</td>
                    <td><Pill tone="blue">{m.category}</Pill></td>
                    <td className="mono">{m.weightKg != null ? `${m.weightKg} kg` : "—"}</td>
                    <td className="mono">{m.lengthCm != null ? `${m.lengthCm}×${m.widthCm ?? "?"}×${m.heightCm ?? "?"}` : "—"}</td>
                    <td className="mono"><b style={{ color: s.inside > 0 ? "#15803d" : "var(--text-muted)" }}>{s.inside}</b> {m.unit}</td>
                    <td className="mono">{s.timesIn}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/* ---------------- Ledger: record + filter movements ----------------------- */
function Ledger({ mats, moves, scoped, myEntity, recordMaterialMove }: {
  mats: ReturnType<typeof useData>["materials"]; moves: ReturnType<typeof useData>["materialMoves"];
  scoped: boolean; myEntity?: string; recordMaterialMove: ReturnType<typeof useData>["recordMaterialMove"];
}) {
  const [code, setCode] = useState(mats[0]?.code ?? "");
  const [direction, setDirection] = useState<Dir>("in");
  const [qty, setQty] = useState("1");
  const [gate, setGate] = useState(GATES[0]);
  const [carrier, setCarrier] = useState("");
  const [remarks, setRemarks] = useState("");
  const selected = mats.find((m) => m.code === code);

  // Filters — pick any combination of item × gate × carrier × direction.
  const [fCode, setFCode] = useState("all");
  const [fGate, setFGate] = useState("all");
  const [fCarrier, setFCarrier] = useState("all");
  const [fDir, setFDir] = useState<"all" | Dir>("all");

  const carriers = useMemo(() => Array.from(new Set(moves.map((m) => m.carrier))), [moves]);
  const gatesUsed = useMemo(() => Array.from(new Set(moves.map((m) => m.gate).filter(Boolean))) as string[], [moves]);

  const filtered = moves.filter((m) =>
    (fCode === "all" || m.code === fCode) &&
    (fGate === "all" || m.gate === fGate) &&
    (fCarrier === "all" || m.carrier === fCarrier) &&
    (fDir === "all" || m.direction === fDir));
  const totals = (["in", "consumed", "out"] as Dir[]).map((d) => ({ d, q: filtered.filter((m) => m.direction === d).reduce((s, m) => s + m.quantity, 0) }));

  const consumedNeedsReason = direction === "consumed" && !remarks.trim();
  const record = () => {
    if (!code || !carrier.trim() || !qty || consumedNeedsReason) return;
    recordMaterialMove({
      code, entityId: scoped ? (myEntity ?? selected?.entityId ?? "") : (selected?.entityId ?? ""),
      direction, quantity: +qty, unit: selected?.unit ?? "nos",
      gate: direction === "consumed" ? undefined : gate, carrier: carrier.trim(), remarks: remarks.trim() || undefined,
    });
    setCarrier(""); setRemarks(""); setQty("1");
  };

  return (
    <>
      <section className="card card-pad mat-form">
        <div className="mat-form-h"><ClipboardList size={15} /> Record a movement</div>
        <div className="mat-move-grid">
          <label className="fld"><span className="fld-l">Item</span><select className="field" value={code} onChange={(e) => setCode(e.target.value)}>{mats.map((m) => <option key={m.code} value={m.code}>{m.code} · {m.name}</option>)}</select></label>
          <label className="fld"><span className="fld-l">Direction</span>
            <div className="mat-dir">
              {(["in", "consumed", "out"] as Dir[]).map((d) => (
                <button key={d} type="button" className={`mat-dir-btn ${direction === d ? "on tone-" + DIR_META[d].tone : ""}`} onClick={() => setDirection(d)}>{DIR_META[d].label}</button>
              ))}
            </div>
          </label>
          <label className="fld"><span className="fld-l">Quantity ({selected?.unit ?? "unit"})</span><input className="field" type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></label>
          {direction !== "consumed" && (
            <label className="fld"><span className="fld-l">Gate</span><select className="field" value={gate} onChange={(e) => setGate(e.target.value)}>{GATES.map((g) => <option key={g}>{g}</option>)}</select></label>
          )}
          <label className="fld"><span className="fld-l">Carrier (who took it)</span><input className="field" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="person name" /></label>
          <label className="fld mat-remarks"><span className="fld-l">{direction === "consumed" ? "Consumption reason (required)" : "Remarks"}</span><input className="field" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={direction === "consumed" ? "e.g. used on A320 hydraulics" : "optional"} /></label>
        </div>
        {consumedNeedsReason && <div className="mat-warn"><AlertTriangle size={13} /> A consumed item must state how it was consumed.</div>}
        <button className="btn btn-brand" onClick={record} disabled={!carrier.trim() || !qty || consumedNeedsReason}>Record movement</button>
      </section>

      <section className="card">
        <div className="mat-filters">
          <FilterSel label="Item" value={fCode} onChange={setFCode} opts={["all", ...mats.map((m) => m.code)]} />
          <FilterSel label="Gate" value={fGate} onChange={setFGate} opts={["all", ...gatesUsed]} />
          <FilterSel label="Carrier" value={fCarrier} onChange={setFCarrier} opts={["all", ...carriers]} />
          <FilterSel label="Direction" value={fDir} onChange={(v) => setFDir(v as "all" | Dir)} opts={["all", "in", "consumed", "out"]} />
          <div className="mat-filter-summary mono">
            {filtered.length} events · {totals.map((t) => `${t.q} ${t.d}`).join(" · ")}
          </div>
        </div>
        <div className="mat-table-wrap">
          <table className="mat-table">
            <thead><tr><th>When</th><th>Code</th><th>Item</th><th>Dir</th><th>Qty</th><th>Gate</th><th>Carrier</th><th>By</th><th>Remarks</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9} className="muted" style={{ padding: 18 }}>No movements match these filters.</td></tr>}
              {filtered.map((m) => {
                const item = mats.find((x) => x.code === m.code);
                const dm = DIR_META[m.direction];
                return (
                  <tr key={m.id}>
                    <td className="mono">{m.ts}</td>
                    <td><code className="mat-code">{m.code}</code></td>
                    <td>{item?.name ?? m.code}</td>
                    <td><Pill tone={dm.tone}>{dm.label}</Pill></td>
                    <td className="mono">{m.quantity} {m.unit}</td>
                    <td className="mono">{m.gate ?? "—"}</td>
                    <td>{m.carrier}</td>
                    <td className="mono muted">{m.by}</td>
                    <td className="muted">{m.remarks ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function FilterSel({ label, value, onChange, opts }: { label: string; value: string; onChange: (v: string) => void; opts: string[] }) {
  return (
    <label className="mat-filter">
      <span>{label}</span>
      <select className="field mini" value={value} onChange={(e) => onChange(e.target.value)}>
        {opts.map((o) => <option key={o} value={o}>{o === "all" ? "All" : o}</option>)}
      </select>
    </label>
  );
}
