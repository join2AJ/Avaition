import { useEffect, useState } from "react";
import { ScrollText, Lock } from "lucide-react";
import type { AuditEntry } from "@/lib/demoData";
import { api } from "@/lib/api";

const TONE_CLASS: Record<string, string> = { ok: "ok", warn: "warn", bad: "bad" };

export default function Audit() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  useEffect(() => { api.listAudit().then(setEntries); }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Audit log</h2>
          <p className="muted">Append-only trail — actor, action, object, before/after, timestamp. Visible to Admin &amp; BCAS · out of scope for any delete permission.</p>
        </div>
        <span className="pill tone-slate"><Lock size={12} /> Append-only</span>
      </div>

      <section className="card">
        <div className="card-head card-pad" style={{ paddingBottom: 8 }}>
          <span className="section-title"><ScrollText size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} /> Trail</span>
          <span className="muted" style={{ fontSize: 12 }}>{entries.length} events</span>
        </div>
        <div className="audit-table">
          <div className="au-head">
            <span>Timestamp</span><span>Actor</span><span>Action</span><span>Object</span><span>Detail</span>
          </div>
          {entries.map((e, i) => (
            <div className={`au-row ${TONE_CLASS[e.tone]}`} key={i}>
              <span className="mono au-ts">{e.ts}</span>
              <span className="au-actor">{e.actor}</span>
              <span className="mono au-action">{e.action}</span>
              <span className="mono au-object">{e.object}</span>
              <span className="au-detail">{e.detail}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
