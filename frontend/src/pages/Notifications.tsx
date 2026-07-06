import { useMemo, useState } from "react";
import { Bell, CheckCheck, Landmark, ClipboardCheck, ShieldCheck, Building2, Cpu } from "lucide-react";
import { useAuth } from "@/app/auth";
import { useData } from "@/app/data";
import { Pill } from "@/components/ui";

// Full notification history with date & time and — for oversight logins — the
// source that pushed each one (BCAS, Pass Section, Admin, Entity, or the System
// for auto-generated expiry intimations).
const SOURCE_META: Record<string, { tone: string; icon: typeof Landmark }> = {
  "BCAS": { tone: "red", icon: Landmark },
  "Pass Section": { tone: "blue", icon: ClipboardCheck },
  "Admin": { tone: "violet", icon: ShieldCheck },
  "Entity": { tone: "green", icon: Building2 },
  "System": { tone: "slate", icon: Cpu },
};
const TONE_LABEL: Record<string, string> = { ok: "info", warn: "attention", bad: "urgent" };

export default function Notifications() {
  const { session } = useAuth();
  const { notificationsFor, markNotificationsRead } = useData();
  const all = notificationsFor(session!.role, session!.entityId);
  const isOversight = ["admin", "bcas", "operator"].includes(session!.role);
  const [src, setSrc] = useState<string>("all");

  const sources = useMemo(() => ["all", ...Array.from(new Set(all.map((n) => n.source || "System")))], [all]);
  const rows = src === "all" ? all : all.filter((n) => (n.source || "System") === src);
  const unread = all.filter((n) => !n.read).length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Notifications</h2>
          <p className="muted">Every intimation with date &amp; time{isOversight ? " and who pushed it" : ""} — pass lifecycle, contracts, expiry, training, penalties. {unread > 0 ? `${unread} unread.` : "All caught up."}</p>
        </div>
        {unread > 0 && <button className="btn btn-ghost" onClick={markNotificationsRead}><CheckCheck size={15} /> Mark all read</button>}
      </div>

      {isOversight && (
        <div className="notif-filter">
          {sources.map((s) => (
            <button key={s} className={`chip-toggle ${src === s ? "on" : ""}`} onClick={() => setSrc(s)}>
              {s === "all" ? "All sources" : s}
              <span className="chip-toggle-n">{s === "all" ? all.length : all.filter((n) => (n.source || "System") === s).length}</span>
            </button>
          ))}
        </div>
      )}

      <section className="card">
        <div className="notif-feed">
          {rows.length === 0 && <div className="reg-empty muted">No notifications{src !== "all" ? ` from ${src}` : ""} yet.</div>}
          {rows.map((n) => {
            const sm = SOURCE_META[n.source || "System"] ?? SOURCE_META.System;
            return (
              <div className={`notif-feed-row ${n.read ? "" : "unread"}`} key={n.id}>
                <span className={`notif-src-badge tone-${sm.tone}`}><sm.icon size={13} /> {n.source || "System"}</span>
                <div className="notif-feed-body">
                  <div className="notif-feed-msg">{n.message}</div>
                  <div className="notif-feed-meta">
                    <span className="mono">{n.ts} IST</span>
                    <span className="notif-aud mono">to {n.to}</span>
                    <Pill tone={n.tone === "ok" ? "green" : n.tone === "warn" ? "amber" : "red"}>{TONE_LABEL[n.tone]}</Pill>
                    {!n.read && <span className="notif-unread-dot" title="Unread" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      {!isOversight && <p className="muted" style={{ fontSize: 11.5 }}><Bell size={12} style={{ verticalAlign: "-1px" }} /> You see only notifications addressed to your organisation.</p>}
    </div>
  );
}
