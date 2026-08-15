import { useMemo, useState } from "react";
import {
  Boxes, PackagePlus, ClipboardList, AlertTriangle,
  Upload, ImagePlus, CheckCircle2, XCircle, Send, Warehouse, FileSpreadsheet,
} from "lucide-react";
import { useAuth } from "@/app/auth";
import { useData } from "@/app/data";
import { today } from "@/domain/entitlements";
import { Pill } from "@/components/ui";
import type { NewMaterial, NewTotRequest } from "@/app/data";
import type { TotRequest, TotStatus, MaterialItem, MaterialMove } from "@/lib/demoData";
import type { Individual } from "@/domain/types";

const TYPES = ["tool", "equipment", "food", "consumable", "chemical", "spare"];
const CATEGORIES = ["A", "B", "C", "D", "E", "F", "G"];
const UNITS = ["nos", "kg", "litre", "box", "metre"];
const GATES = ["G3", "G5", "G7", "CARGO-1", "CARGO-2"];
// Gate → the zone it opens onto (used to check the carrier's AEP covers it).
const GATE_ZONE: Record<string, string> = { "G3": "P", "G5": "P", "G7": "T", "CARGO-1": "Cd", "CARGO-2": "Ci" };
const DESIGNATIONS = ["Pass Section IC", "CSO", "CAO"];
const CONSUME_REASONS = ["consumed", "sold_out", "damaged", "returned"];

// A valid AEP holder (AVSEC 02/2022): registered individual whose AVSEC training
// is current (§13 — a lapse deactivates the AEP), whose zones cover the gate's
// zone (need-to-access), and who is not on the Stop List (§9).
function validAep(ind: Individual, zone: string | undefined, isStopListed: (n: string) => unknown): boolean {
  const t = today();
  const trainingOk = !ind.avsecTrainingExpiry || ind.avsecTrainingExpiry >= t;
  const zoneOk = !zone || (ind.zones ?? []).includes(zone);
  return trainingOk && zoneOk && !isStopListed(ind.name);
}

type Dir = "in" | "consumed" | "out";
const DIR_META: Record<Dir, { label: string; tone: "green" | "amber" | "red" }> = {
  in: { label: "IN", tone: "green" }, out: { label: "OUT", tone: "red" }, consumed: { label: "CONSUMED", tone: "amber" },
};
const STATUS_TONE: Record<TotStatus, "amber" | "blue" | "green" | "red"> = {
  submitted: "amber", reviewed: "blue", approved: "green", rejected: "red",
};

export default function Tot() {
  const { session } = useAuth();
  const d = useData();
  const role = session!.role;
  const scoped = ["entity", "others", "individual"].includes(role);
  const myEntity = session!.entityId;

  const mats = useMemo(() => (scoped ? d.materials.filter((m) => m.entityId === myEntity) : d.materials), [d.materials, scoped, myEntity]);
  const moves = useMemo(() => (scoped ? d.materialMoves.filter((m) => m.entityId === myEntity) : d.materialMoves), [d.materialMoves, scoped, myEntity]);
  const reqs = useMemo(() => (scoped ? d.totRequests.filter((r) => r.entityId === myEntity) : d.totRequests), [d.totRequests, scoped, myEntity]);

  const stat = (code: string) => {
    const ms = d.materialMoves.filter((m) => m.code === code);
    const sum = (dir: Dir) => ms.filter((m) => m.direction === dir).reduce((s, m) => s + m.quantity, 0);
    const inQ = sum("in"), consumedQ = sum("consumed"), outQ = sum("out");
    return { inside: inQ - consumedQ - outQ, timesIn: ms.filter((m) => m.direction === "in").length };
  };

  const [tab, setTab] = useState<"requests" | "items" | "ledger" | "inside">("requests");
  const pending = reqs.filter((r) => r.status !== "approved" && r.status !== "rejected").length;

  return (
    <div className="page mat-page">
      <div className="page-head">
        <div>
          <h2><Boxes size={20} style={{ verticalAlign: "-4px", marginRight: 8 }} />ToT <span className="muted" style={{ fontWeight: 400 }}>— Tools &amp; Tackles · §12B</span></h2>
          <p className="muted">Declare tools/materials with dimensions &amp; purpose, get them approved by an authorised signatory, then move them in/out through permitted gates under CISF check — with consumption declared and a live view of what is inside.</p>
        </div>
      </div>

      <div className="mat-tiles">
        <Tile label="ToT requests" value={reqs.length} />
        <Tile label="Awaiting approval" value={pending} accent="#b45309" />
        <Tile label="Items catalogued" value={mats.length} />
        <Tile label="Currently inside" value={mats.filter((m) => stat(m.code).inside > 0).length} accent="#15803d" />
      </div>

      <div className="db-viewtabs">
        <button className={`db-vtab ${tab === "requests" ? "on" : ""}`} onClick={() => setTab("requests")}><Send size={14} /> Requests &amp; approval</button>
        <button className={`db-vtab ${tab === "items" ? "on" : ""}`} onClick={() => setTab("items")}><PackagePlus size={14} /> Items</button>
        <button className={`db-vtab ${tab === "ledger" ? "on" : ""}`} onClick={() => setTab("ledger")}><ClipboardList size={14} /> Gate ledger</button>
        <button className={`db-vtab ${tab === "inside" ? "on" : ""}`} onClick={() => setTab("inside")}><Warehouse size={14} /> Inside now</button>
      </div>

      {tab === "requests" && <Requests d={d} reqs={reqs} mats={mats} role={role} scoped={scoped} myEntity={myEntity} />}
      {tab === "items" && <Items d={d} mats={mats} stat={stat} scoped={scoped} myEntity={myEntity} />}
      {tab === "ledger" && <Ledger d={d} mats={mats} moves={moves} reqs={reqs} scoped={scoped} myEntity={myEntity} role={role} />}
      {tab === "inside" && <Inside mats={mats} stat={stat} entities={d.entities} scoped={scoped} />}
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return <div className="mat-tile card"><b style={accent ? { color: accent } : undefined}>{value}</b><span>{label}</span></div>;
}

/* =============================== REQUESTS ================================= */
function Requests({ d, reqs, mats, role, scoped, myEntity }: {
  d: ReturnType<typeof useData>; reqs: TotRequest[]; mats: MaterialItem[]; role: string; scoped: boolean; myEntity?: string;
}) {
  const canSubmit = ["entity", "others", "admin", "operator"].includes(role);
  const canReview = role === "operator" || role === "admin";
  const canApprove = role === "admin"; // authorised signatory (IC/CSO/CAO)

  const [purpose, setPurpose] = useState("");
  const [location, setLocation] = useState("Apron (P)");
  const [vf, setVf] = useState("2026-07-06");
  const [vt, setVt] = useState("2026-07-20");
  const [gates, setGates] = useState<string[]>(["G3"]);
  const [lines, setLines] = useState<{ code: string; qty: number }[]>([]);
  const [pick, setPick] = useState(mats[0]?.code ?? "");
  const [pickQty, setPickQty] = useState("1");

  const addLine = () => {
    if (!pick) return;
    setLines((x) => [...x.filter((l) => l.code !== pick), { code: pick, qty: +pickQty || 1 }]);
  };
  const submit = () => {
    if (!purpose.trim() || lines.length === 0) return;
    const payload: NewTotRequest = {
      entityId: scoped ? (myEntity ?? "ENT-01") : (mats[0]?.entityId ?? "ENT-01"),
      purpose: purpose.trim(), location, validFrom: vf, validTo: vt, gates,
      lines: lines.map((l) => ({ code: l.code, qty: l.qty, unit: mats.find((m) => m.code === l.code)?.unit ?? "nos" })),
    };
    d.createTotRequest(payload);
    setPurpose(""); setLines([]);
  };
  const toggleGate = (g: string) => setGates((x) => (x.includes(g) ? x.filter((y) => y !== g) : [...x, g]));

  return (
    <>
      {canSubmit && (
        <section className="card card-pad mat-form">
          <div className="mat-form-h"><Send size={15} /> New ToT request <span className="muted">— declare items &amp; purpose; a signatory (IC/CSO/CAO) approves</span></div>
          <div className="mat-grid">
            <label className="fld mat-remarks"><span className="fld-l">Purpose / work</span><input className="field" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. A320 line maintenance" /></label>
            <label className="fld"><span className="fld-l">Location / zone of use</span><input className="field" value={location} onChange={(e) => setLocation(e.target.value)} /></label>
            <label className="fld"><span className="fld-l">Valid from</span><input className="field" type="date" value={vf} onChange={(e) => setVf(e.target.value)} /></label>
            <label className="fld"><span className="fld-l">Valid to</span><input className="field" type="date" value={vt} onChange={(e) => setVt(e.target.value)} /></label>
            <label className="fld mat-remarks"><span className="fld-l">Permitted gates</span>
              <div className="tot-gates">{GATES.map((g) => <button key={g} type="button" className={`chip ${gates.includes(g) ? "on" : ""}`} onClick={() => toggleGate(g)}>{g}</button>)}</div>
            </label>
          </div>
          <div className="tot-lines">
            <div className="tot-lines-add">
              <select className="field" value={pick} onChange={(e) => setPick(e.target.value)}>{mats.map((m) => <option key={m.code} value={m.code}>{m.code} · {m.name}</option>)}</select>
              <input className="field" type="number" value={pickQty} onChange={(e) => setPickQty(e.target.value)} style={{ maxWidth: 90 }} />
              <button className="btn btn-ghost" onClick={addLine}>+ Add item</button>
            </div>
            {lines.length > 0 && (
              <div className="tot-lines-list">
                {lines.map((l) => {
                  const m = mats.find((x) => x.code === l.code);
                  return <span key={l.code} className="tot-line-chip"><code>{l.code}</code> {m?.name} · {l.qty} {m?.unit} <button onClick={() => setLines((x) => x.filter((y) => y.code !== l.code))}>×</button></span>;
                })}
              </div>
            )}
          </div>
          <button className="btn btn-brand" onClick={submit} disabled={!purpose.trim() || lines.length === 0}><Send size={14} /> Submit ToT request</button>
        </section>
      )}

      <div className="tot-req-list">
        {reqs.length === 0 && <div className="card card-pad muted">No ToT requests yet.</div>}
        {reqs.map((r) => <RequestCard key={r.id} r={r} d={d} mats={mats} canReview={canReview} canApprove={canApprove} entityName={d.entities.find((e) => e.id === r.entityId)?.name ?? r.entityId} />)}
      </div>
    </>
  );
}

function RequestCard({ r, d, mats, canReview, canApprove, entityName }: {
  r: TotRequest; d: ReturnType<typeof useData>; mats: MaterialItem[]; canReview: boolean; canApprove: boolean; entityName: string;
}) {
  const [designation, setDesignation] = useState(DESIGNATIONS[1]);
  const [remark, setRemark] = useState("");
  const steps: { key: TotStatus; label: string; who?: string; at?: string }[] = [
    { key: "submitted", label: "Submitted", who: r.submittedBy, at: r.submittedAt },
    { key: "reviewed", label: "Reviewed (Pass Section)", who: r.reviewedBy, at: r.reviewedAt },
    { key: r.status === "rejected" ? "rejected" : "approved", label: r.status === "rejected" ? "Rejected" : "Approved (signatory)", who: r.approver, at: r.decidedAt },
  ];
  const order: TotStatus[] = ["submitted", "reviewed", "approved"];
  const reachedIdx = r.status === "rejected" ? 2 : order.indexOf(r.status);

  return (
    <article className="card tot-card">
      <div className="tot-card-h">
        <div>
          <code className="mat-code">{r.id}</code> <b>{entityName}</b>
          <span className="muted"> · {r.purpose} · {r.location}</span>
        </div>
        <Pill tone={STATUS_TONE[r.status]}>{r.status.toUpperCase()}</Pill>
      </div>
      <div className="tot-card-meta mono muted">Valid {r.validFrom} → {r.validTo} · gates {r.gates.join(", ")}</div>
      <div className="tot-card-lines">
        {r.lines.map((l) => {
          const m = mats.find((x) => x.code === l.code);
          return <span key={l.code} className="tot-line-chip"><code>{l.code}</code> {m?.name ?? l.code} · {l.qty} {l.unit}</span>;
        })}
      </div>

      <div className="tot-steps">
        {steps.map((s, i) => (
          <div key={i} className={`tot-step ${i <= reachedIdx ? (r.status === "rejected" && i === 2 ? "bad" : "done") : ""}`}>
            <span className="tot-step-dot" />
            <div><b>{s.label}</b>{s.who && <small>{s.who}{s.at ? ` · ${s.at}` : ""}</small>}</div>
          </div>
        ))}
      </div>
      {r.remark && <div className="tot-remark muted">“{r.remark}”</div>}

      {(canReview && r.status === "submitted") && (
        <div className="tot-actions">
          <button className="btn btn-brand" onClick={() => d.reviewTotRequest(r.id)}><CheckCircle2 size={14} /> Review &amp; forward to signatory</button>
        </div>
      )}
      {(canApprove && (r.status === "reviewed" || r.status === "submitted")) && (
        <div className="tot-actions tot-approve">
          <select className="field mini" value={designation} onChange={(e) => setDesignation(e.target.value)}>{DESIGNATIONS.map((x) => <option key={x}>{x}</option>)}</select>
          <input className="field mini" placeholder="remark (optional)" value={remark} onChange={(e) => setRemark(e.target.value)} />
          <button className="btn btn-brand" onClick={() => d.decideTotRequest(r.id, "approved", designation, remark || undefined)}><CheckCircle2 size={14} /> Approve</button>
          <button className="btn btn-ghost" onClick={() => d.decideTotRequest(r.id, "rejected", designation, remark || undefined)}><XCircle size={14} /> Reject</button>
        </div>
      )}
    </article>
  );
}

/* ================================ ITEMS ================================== */
function Items({ d, mats, stat, scoped, myEntity }: {
  d: ReturnType<typeof useData>; mats: MaterialItem[]; stat: (c: string) => { inside: number; timesIn: number }; scoped: boolean; myEntity?: string;
}) {
  const entities = d.entities;
  const blank: NewMaterial = { name: "", type: "tool", category: "A", unit: "nos", consumable: false, hazardous: false, entityId: myEntity ?? entities[0]?.id ?? "ENT-01" };
  const [f, setF] = useState<NewMaterial>(blank);
  const set = (p: Partial<NewMaterial>) => setF((x) => ({ ...x, ...p }));
  const [bulk, setBulk] = useState("");
  const [bulkMsg, setBulkMsg] = useState("");

  const onImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set({ image: String(reader.result) });
    reader.readAsDataURL(file);
  };
  const add = () => {
    if (!f.name.trim()) return;
    d.createMaterial({ ...f, entityId: scoped ? (myEntity ?? f.entityId) : f.entityId });
    setF({ ...blank, entityId: f.entityId });
  };

  // CSV: name,type,category,unit,weightKg,lengthCm,widthCm,heightCm,consumable,hazardous
  const runBulk = () => {
    const rows = bulk.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsed: NewMaterial[] = [];
    for (const line of rows) {
      const c = line.split(",").map((x) => x.trim());
      if (c[0].toLowerCase() === "name") continue; // header
      if (!c[0]) continue;
      parsed.push({
        name: c[0], type: c[1] || "tool", category: (c[2] || "A").toUpperCase(), unit: c[3] || "nos",
        weightKg: c[4] ? +c[4] : undefined, lengthCm: c[5] ? +c[5] : undefined, widthCm: c[6] ? +c[6] : undefined, heightCm: c[7] ? +c[7] : undefined,
        consumable: /^(1|true|yes|y)$/i.test(c[8] || ""), hazardous: /^(1|true|yes|y)$/i.test(c[9] || ""),
        entityId: scoped ? (myEntity ?? "ENT-01") : f.entityId,
      });
    }
    const n = d.bulkAddMaterials(parsed);
    setBulk(""); setBulkMsg(`${n} item(s) uploaded.`); setTimeout(() => setBulkMsg(""), 3000);
  };

  return (
    <>
      <section className="card card-pad mat-form">
        <div className="mat-form-h"><PackagePlus size={15} /> Register an item <span className="muted">— a code is assigned automatically; add a photo for the gate</span></div>
        <div className="mat-grid">
          <label className="fld"><span className="fld-l">Item name</span><input className="field" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. AME toolkit" /></label>
          <label className="fld"><span className="fld-l">Type</span><select className="field" value={f.type} onChange={(e) => set({ type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label className="fld"><span className="fld-l">Annexure A–G</span><select className="field" value={f.category} onChange={(e) => set({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>Category {c}</option>)}</select></label>
          <label className="fld"><span className="fld-l">Unit</span><select className="field" value={f.unit} onChange={(e) => set({ unit: e.target.value })}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></label>
          <label className="fld"><span className="fld-l">Weight (kg)</span><input className="field" type="number" value={f.weightKg ?? ""} onChange={(e) => set({ weightKg: e.target.value ? +e.target.value : undefined })} /></label>
          <label className="fld"><span className="fld-l">L × W × H (cm)</span>
            <div className="mat-dims">
              <input className="field" type="number" placeholder="L" value={f.lengthCm ?? ""} onChange={(e) => set({ lengthCm: e.target.value ? +e.target.value : undefined })} />
              <input className="field" type="number" placeholder="W" value={f.widthCm ?? ""} onChange={(e) => set({ widthCm: e.target.value ? +e.target.value : undefined })} />
              <input className="field" type="number" placeholder="H" value={f.heightCm ?? ""} onChange={(e) => set({ heightCm: e.target.value ? +e.target.value : undefined })} />
            </div>
          </label>
          {!scoped && <label className="fld"><span className="fld-l">Owning agency</span><select className="field" value={f.entityId} onChange={(e) => set({ entityId: e.target.value })}>{entities.map((en) => <option key={en.id} value={en.id}>{en.name}</option>)}</select></label>}
          <label className="fld"><span className="fld-l">Photo (for CISF)</span>
            <div className="tot-img-input">
              {f.image ? <img src={f.image} alt="preview" className="tot-thumb" /> : <span className="tot-img-ph"><ImagePlus size={16} /></span>}
              <input type="file" accept="image/*" onChange={(e) => onImage(e.target.files?.[0])} />
            </div>
          </label>
          <label className="fld mat-check"><input type="checkbox" checked={f.consumable} onChange={(e) => set({ consumable: e.target.checked })} /> <span>Consumable</span></label>
          <label className="fld mat-check"><input type="checkbox" checked={f.hazardous} onChange={(e) => set({ hazardous: e.target.checked })} /> <span>Hazardous / DG</span></label>
        </div>
        <button className="btn btn-brand" onClick={add} disabled={!f.name.trim()}><PackagePlus size={14} /> Register item</button>
      </section>

      <section className="card card-pad mat-form">
        <div className="mat-form-h"><Upload size={15} /> Bulk upload <span className="muted">— thousands of items; CSV: name,type,category,unit,weightKg,L,W,H,consumable,hazardous</span></div>
        <textarea className="field mono" rows={4} placeholder={"AME toolkit,tool,A,box,12.5,60,40,25,no,no\nHydraulic oil,chemical,E,litre,0.9,,,,yes,yes"} value={bulk} onChange={(e) => setBulk(e.target.value)} />
        <div className="tot-bulk-actions">
          <label className="btn btn-ghost"><FileSpreadsheet size={14} /> Load .csv<input type="file" accept=".csv,text/csv" hidden onChange={(e) => { const fl = e.target.files?.[0]; if (fl) { const rd = new FileReader(); rd.onload = () => setBulk(String(rd.result)); rd.readAsText(fl); } }} /></label>
          <button className="btn btn-brand" onClick={runBulk} disabled={!bulk.trim()}><Upload size={14} /> Upload rows</button>
          {bulkMsg && <span className="sql-ok"><CheckCircle2 size={13} /> {bulkMsg}</span>}
        </div>
      </section>

      <section className="card">
        <div className="mat-table-wrap">
          <table className="mat-table">
            <thead><tr><th></th><th>Code</th><th>Item</th><th>Type</th><th>Annexure</th><th>Weight</th><th>L×W×H</th><th>Inside</th><th>Times in</th></tr></thead>
            <tbody>
              {mats.length === 0 && <tr><td colSpan={9} className="muted" style={{ padding: 18 }}>No items yet.</td></tr>}
              {mats.map((m) => {
                const s = stat(m.code);
                return (
                  <tr key={m.code}>
                    <td>{m.image ? <img src={m.image} alt="" className="tot-thumb sm" /> : <span className="tot-thumb sm ph"><Boxes size={13} /></span>}</td>
                    <td><code className="mat-code">{m.code}</code></td>
                    <td>{m.name}{m.hazardous && <span className="mat-haz" title="Hazardous"> ⚠</span>}</td>
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

/* =============================== LEDGER ================================== */
function Ledger({ d, mats, moves, reqs, scoped, myEntity, role }: {
  d: ReturnType<typeof useData>; mats: MaterialItem[]; moves: MaterialMove[]; reqs: TotRequest[]; scoped: boolean; myEntity?: string; role: string;
}) {
  const approved = reqs.filter((r) => r.status === "approved");
  const [reqId, setReqId] = useState(approved[0]?.id ?? "");
  const req = approved.find((r) => r.id === reqId);
  const reqItems = req ? mats.filter((m) => req.lines.some((l) => l.code === m.code)) : mats;
  const [code, setCode] = useState(reqItems[0]?.code ?? "");
  const [direction, setDirection] = useState<Dir>("in");
  const [qty, setQty] = useState("1");
  const [gate, setGate] = useState(req?.gates[0] ?? GATES[0]);
  const [carrierId, setCarrierId] = useState("");
  const [reason, setReason] = useState(CONSUME_REASONS[0]);
  const [remarks, setRemarks] = useState("");
  const selected = mats.find((m) => m.code === code);

  // Carrier must be a valid AEP holder of the request's agency, whose AEP covers
  // the gate's zone (skipped for consumption, which happens inside).
  const zone = direction === "consumed" ? undefined : GATE_ZONE[gate];
  const eligible = d.individuals.filter((i) => i.entityId === (req?.entityId ?? "") && validAep(i, zone, d.isStopListed));
  const carrier = eligible.find((i) => i.id === carrierId) ?? eligible[0];

  const [fCode, setFCode] = useState("all");
  const [fGate, setFGate] = useState("all");
  const [fCarrier, setFCarrier] = useState("all");
  const [fDir, setFDir] = useState<"all" | Dir>("all");
  const carriers = useMemo(() => Array.from(new Set(moves.map((m) => m.carrier))), [moves]);
  const gatesUsed = useMemo(() => Array.from(new Set(moves.map((m) => m.gate).filter(Boolean))) as string[], [moves]);
  const filtered = moves.filter((m) =>
    (fCode === "all" || m.code === fCode) && (fGate === "all" || m.gate === fGate) &&
    (fCarrier === "all" || m.carrier === fCarrier) && (fDir === "all" || m.direction === fDir));
  const totals = (["in", "consumed", "out"] as Dir[]).map((x) => ({ x, q: filtered.filter((m) => m.direction === x).reduce((s, m) => s + m.quantity, 0) }));

  const consumedNeedsReason = direction === "consumed" && !remarks.trim();
  const noApproved = approved.length === 0;
  const noCarrier = eligible.length === 0;
  const record = () => {
    if (noApproved || noCarrier || !carrier || !code || !qty || consumedNeedsReason) return;
    d.recordMaterialMove({
      code, entityId: scoped ? (myEntity ?? req?.entityId ?? "") : (req?.entityId ?? selected?.entityId ?? ""), requestId: req?.id,
      direction, quantity: +qty, unit: selected?.unit ?? "nos",
      gate: direction === "consumed" ? undefined : gate, carrier: carrier.name, carrierId: carrier.id,
      reason: direction === "consumed" ? reason : undefined, remarks: remarks.trim() || undefined,
    });
    setRemarks(""); setQty("1");
  };

  return (
    <>
      <section className="card card-pad mat-form">
        <div className="mat-form-h"><ClipboardList size={15} /> Record a gate movement <span className="muted">{role === "cisf" ? "— CISF verification" : "— against an approved ToT"}</span></div>
        {noApproved ? <div className="mat-warn"><AlertTriangle size={13} /> No approved ToT request yet — get a request approved before recording entry/exit.</div> : (
          <>
            <div className="mat-move-grid">
              <label className="fld"><span className="fld-l">Approved ToT</span><select className="field" value={reqId} onChange={(e) => { setReqId(e.target.value); const rq = approved.find((r) => r.id === e.target.value); setGate(rq?.gates[0] ?? GATES[0]); }}>{approved.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.purpose}</option>)}</select></label>
              <label className="fld"><span className="fld-l">Item</span><select className="field" value={code} onChange={(e) => setCode(e.target.value)}>{reqItems.map((m) => <option key={m.code} value={m.code}>{m.code} · {m.name}</option>)}</select></label>
              <label className="fld"><span className="fld-l">Direction</span>
                <div className="mat-dir">{(["in", "consumed", "out"] as Dir[]).map((x) => <button key={x} type="button" className={`mat-dir-btn ${direction === x ? "on tone-" + DIR_META[x].tone : ""}`} onClick={() => setDirection(x)}>{DIR_META[x].label}</button>)}</div>
              </label>
              <label className="fld"><span className="fld-l">Quantity ({selected?.unit ?? "unit"})</span><input className="field" type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></label>
              {direction !== "consumed" && <label className="fld"><span className="fld-l">Gate</span><select className="field" value={gate} onChange={(e) => setGate(e.target.value)}>{(req?.gates ?? GATES).map((g) => <option key={g}>{g}</option>)}</select></label>}
              {direction === "consumed" && <label className="fld"><span className="fld-l">Disposition</span><select className="field" value={reason} onChange={(e) => setReason(e.target.value)}>{CONSUME_REASONS.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}</select></label>}
              <label className="fld"><span className="fld-l">Carrier — valid AEP holder</span>
                <select className="field" value={carrier?.id ?? ""} onChange={(e) => setCarrierId(e.target.value)} disabled={noCarrier}>
                  {noCarrier && <option value="">— no valid AEP holder —</option>}
                  {eligible.map((i) => <option key={i.id} value={i.id}>{i.name} · {(i.zones ?? []).join("/")} · AEP ✓</option>)}
                </select>
              </label>
              <label className="fld mat-remarks"><span className="fld-l">{direction === "consumed" ? "How consumed / sold (required)" : "Remarks"}</span><input className="field" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={direction === "consumed" ? "e.g. sold out at crew galley" : "optional"} /></label>
            </div>
            {noCarrier && <div className="mat-warn"><AlertTriangle size={13} /> No valid AEP holder of this agency {zone ? `covers gate ${gate} (zone ${zone})` : "is available"} — only a valid AEP holder (AVSEC-current, zone-covering, not stop-listed) may carry ToT material (§9 · §13).</div>}
            {consumedNeedsReason && <div className="mat-warn"><AlertTriangle size={13} /> A consumed / sold-out item must state how it was disposed.</div>}
            <button className="btn btn-brand" onClick={record} disabled={noCarrier || !carrier || !qty || consumedNeedsReason}>Record movement</button>
          </>
        )}
      </section>

      <section className="card">
        <div className="mat-filters">
          <FilterSel label="Item" value={fCode} onChange={setFCode} opts={["all", ...mats.map((m) => m.code)]} />
          <FilterSel label="Gate" value={fGate} onChange={setFGate} opts={["all", ...gatesUsed]} />
          <FilterSel label="Carrier" value={fCarrier} onChange={setFCarrier} opts={["all", ...carriers]} />
          <FilterSel label="Direction" value={fDir} onChange={(v) => setFDir(v as "all" | Dir)} opts={["all", "in", "consumed", "out"]} />
          <div className="mat-filter-summary mono">{filtered.length} events · {totals.map((t) => `${t.q} ${t.x}`).join(" · ")}</div>
        </div>
        <div className="mat-table-wrap">
          <table className="mat-table">
            <thead><tr><th>When</th><th>ToT</th><th>Code</th><th>Item</th><th>Dir</th><th>Qty</th><th>Gate</th><th>Carrier</th><th>By</th><th>Note</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={10} className="muted" style={{ padding: 18 }}>No movements match.</td></tr>}
              {filtered.map((m) => {
                const item = mats.find((x) => x.code === m.code);
                return (
                  <tr key={m.id}>
                    <td className="mono">{m.ts}</td>
                    <td className="mono muted">{m.requestId ?? "—"}</td>
                    <td><code className="mat-code">{m.code}</code></td>
                    <td>{item?.name ?? m.code}</td>
                    <td><Pill tone={DIR_META[m.direction].tone}>{DIR_META[m.direction].label}</Pill></td>
                    <td className="mono">{m.quantity} {m.unit}</td>
                    <td className="mono">{m.gate ?? "—"}</td>
                    <td>{m.carrier}{m.carrierId && <span className="tot-aep" title="Verified valid AEP holder">AEP ✓</span>}</td>
                    <td className="mono muted">{m.by}</td>
                    <td className="muted">{m.reason ? `${m.reason.replace("_", " ")}${m.remarks ? " · " : ""}` : ""}{m.remarks ?? (m.reason ? "" : "—")}</td>
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

/* =============================== INSIDE ================================== */
function Inside({ mats, stat, entities, scoped }: {
  mats: MaterialItem[]; stat: (c: string) => { inside: number; timesIn: number }; entities: ReturnType<typeof useData>["entities"]; scoped: boolean;
}) {
  const inside = mats.map((m) => ({ m, qty: stat(m.code).inside })).filter((r) => r.qty > 0);
  const totalWeight = inside.reduce((s, r) => s + (r.m.weightKg ?? 0) * r.qty, 0);

  return (
    <>
      <div className="mat-tiles">
        <Tile label={scoped ? "Your items inside" : "Distinct items inside"} value={inside.length} accent="#15803d" />
        <Tile label="Approx weight inside (kg)" value={Math.round(totalWeight)} />
      </div>
      <section className="card">
        <div className="mat-table-wrap">
          <table className="mat-table">
            <thead><tr><th></th><th>Code</th><th>Item</th><th>Annexure</th><th>{scoped ? "Type" : "Agency"}</th><th>Qty inside</th><th>Unit weight</th></tr></thead>
            <tbody>
              {inside.length === 0 && <tr><td colSpan={7} className="muted" style={{ padding: 18 }}>Nothing inside right now.</td></tr>}
              {inside.map(({ m, qty }) => (
                <tr key={m.code}>
                  <td>{m.image ? <img src={m.image} alt="" className="tot-thumb sm" /> : <span className="tot-thumb sm ph"><Boxes size={13} /></span>}</td>
                  <td><code className="mat-code">{m.code}</code></td>
                  <td>{m.name}{m.hazardous && <span className="mat-haz"> ⚠</span>}</td>
                  <td><Pill tone="blue">{m.category}</Pill></td>
                  <td>{scoped ? <span className="mono">{m.type}</span> : (entities.find((e) => e.id === m.entityId)?.name ?? m.entityId)}</td>
                  <td className="mono"><b style={{ color: "#15803d" }}>{qty}</b> {m.unit}</td>
                  <td className="mono">{m.weightKg != null ? `${m.weightKg} kg` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function FilterSel({ label, value, onChange, opts }: { label: string; value: string; onChange: (v: string) => void; opts: string[] }) {
  return (
    <label className="mat-filter"><span>{label}</span>
      <select className="field mini" value={value} onChange={(e) => onChange(e.target.value)}>{opts.map((o) => <option key={o} value={o}>{o === "all" ? "All" : o}</option>)}</select>
    </label>
  );
}
