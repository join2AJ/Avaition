import { useState } from "react";
import { Check, Clock, Dot } from "lucide-react";
import type { Application } from "@/domain/types";
import { lifecycleFor, stepState, slaHealth, SLA_HEALTH_META, SLA_STANDARDS } from "@/domain/sla";
import { useData } from "@/app/data";
import { Pill } from "./ui";

export default function SlaStepper({ app }: { app: Application }) {
  const { recordSlaJustification } = useData();
  const steps = lifecycleFor(app.pillar, app.passType);
  const health = slaHealth(app.status);
  const hm = SLA_HEALTH_META[health];
  const standard = SLA_STANDARDS.find((s) => s.passType === app.passType);
  const stepAt = (stage: string) => app.stepLog?.find((s) => s.stage === stage)?.at;
  const existingJustification = app.stepLog?.find((s) => s.slaNote)?.slaNote;
  const [note, setNote] = useState("");

  return (
    <div className="card card-pad sla-stepper">
      <div className="card-head">
        <div>
          <span className="section-title">Pass lifecycle & SLA</span>
          <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
            {standard ? `${standard.label} · target ${standard.overall}` : "Lifecycle flow"}
            {standard?.assumed && <span className="assumed-tag">assumed</span>}
            {app.createdAtTs && <> · raised {app.createdAtTs}</>}
            {app.validTo && <> · valid to <b className="mono">{app.validTo}</b></>}
          </p>
        </div>
        <Pill tone={hm.tone} dot>{hm.label}</Pill>
      </div>

      {health === "breached" && (
        <div className="sla-breach">
          <b>SLA breached — justification required.</b>
          {existingJustification ? (
            <p className="sla-just-done">Recorded: “{existingJustification}”</p>
          ) : (
            <div className="sla-just-form">
              <input className="field" placeholder="Reason for the SLA breach (mandatory)…" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="btn btn-brand" disabled={!note.trim()} onClick={() => { recordSlaJustification(app.id, note.trim()); setNote(""); }}>Record</button>
            </div>
          )}
        </div>
      )}

      <ol className="stepper stagger">
        {steps.map((s) => {
          const st = stepState(s, app.status);
          return (
            <li key={s.n} className={`step ${st}`}>
              <span className="step-rail">
                <span className="step-node">
                  {st === "done" ? <Check size={13} /> : st === "current" ? <Clock size={12} /> : <Dot size={16} />}
                </span>
              </span>
              <div className="step-body">
                <div className="step-top">
                  <span className="step-phase">{s.phase}</span>
                  {st === "current" && <Pill tone={hm.tone}>{hm.label}</Pill>}
                  {st === "done" && <span className="pill tone-green">Cleared</span>}
                </div>
                <div className="step-action">{s.action}</div>
                <div className="step-meta">
                  <span className="step-owner">{s.owner}</span>
                  <span className={`step-sla ${s.assumed ? "assumed" : ""}`}>
                    <Clock size={11} /> {s.sla}
                  </span>
                  {stepAt(s.stage) && <span className="step-at mono">✓ {stepAt(s.stage)}</span>}
                  {s.clause && <span className="badge-clause">{s.clause}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
