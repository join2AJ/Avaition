import { useMemo, useState } from "react";
import { ScrollText, Lock } from "lucide-react";
import { useAuth } from "@/app/auth";
import { useData } from "@/app/data";
import { ROLE_LABEL } from "@/domain/roles";

const TONE_CLASS: Record<string, string> = { ok: "ok", warn: "warn", bad: "bad" };

// Login categories to filter by. Admin sees the full detailed trail and can
// slice it by any login category; other roles see the trail unfiltered.
const CATEGORIES = ["all", "admin", "bcas", "operator", "cisf", "entity", "individual", "system"] as const;
const CAT_LABEL: Record<string, string> = {
  all: "All logins", system: "System", ...ROLE_LABEL,
};

export default function Audit() {
  const { session } = useAuth();
  const { audit } = useData();
  const [cat, setCat] = useState<string>("all");
  const isAdmin = session?.role === "admin";

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    audit.forEach((e) => { m[e.role] = (m[e.role] ?? 0) + 1; });
    return m;
  }, [audit]);

  const rows = cat === "all" ? audit : audit.filter((e) => e.role === cat);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Audit log</h2>
          <p className="muted">
            Append-only, <b>login-wise</b> trail — actor, login category, action, object, timestamp.
            {isAdmin ? " Admin sees the complete detailed audit and can filter by login category." : " Visible to Admin & BCAS."}
          </p>
        </div>
        <span className="pill tone-slate"><Lock size={12} /> Append-only</span>
      </div>

      {isAdmin && (
        <div className="audit-cats">
          {CATEGORIES.map((c) => (
            <button key={c} className={`audit-cat ${cat === c ? "active" : ""}`} onClick={() => setCat(c)}>
              {CAT_LABEL[c] ?? c}
              <span className="audit-cat-n">{c === "all" ? audit.length : counts[c] ?? 0}</span>
            </button>
          ))}
        </div>
      )}

      <section className="card">
        <div className="card-head card-pad" style={{ paddingBottom: 8 }}>
          <span className="section-title"><ScrollText size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            {cat === "all" ? "Complete trail" : `${CAT_LABEL[cat] ?? cat} activity`}</span>
          <span className="muted" style={{ fontSize: 12 }}>{rows.length} events</span>
        </div>
        <div className="audit-table">
          <div className="au-head">
            <span>Timestamp</span><span>Actor (login)</span><span>Category</span><span>Action</span><span>Object</span><span>Detail</span>
          </div>
          {rows.map((e, i) => (
            <div className={`au-row ${TONE_CLASS[e.tone]}`} key={i}>
              <span className="mono au-ts">{e.ts}</span>
              <span className="au-actor">{e.actor}</span>
              <span><span className={`cat-chip cat-${e.role}`}>{CAT_LABEL[e.role] ?? e.role}</span></span>
              <span className="mono au-action">{e.action}</span>
              <span className="mono au-object">{e.object}</span>
              <span className="au-detail">{e.detail}</span>
            </div>
          ))}
          {rows.length === 0 && <div className="reg-empty muted">No events for this login category.</div>}
        </div>
      </section>
    </div>
  );
}
