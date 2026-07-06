import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Bell, LogOut, Moon, Plane, Search, Sun, PanelLeftClose, PanelLeft } from "lucide-react";
import { useAuth } from "@/app/auth";
import { useTheme } from "@/app/theme";
import { useData } from "@/app/data";
import { NAV_BY_ROLE } from "@/app/nav";
import { ROLE_LABEL } from "@/domain/roles";
import { PILLARS } from "@/domain/types";

export default function Shell({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { notifications, markNotificationsRead } = useData();
  const nav = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [q, setQ] = useState("");
  // Audience scoping — a role only sees notifications addressed to it. Aerodrome
  // staff (admin/operator/bcas) oversee the pipeline; an entity/individual login
  // must not see internal BCAS/operator traffic or other audiences' messages.
  const AUDIENCE: Record<string, string[]> = {
    admin: ["entity", "bcas", "individual", "operator"],
    bcas: ["bcas", "entity", "individual", "operator"],
    operator: ["operator", "entity", "individual", "bcas"],
    entity: ["entity"],
    others: ["entity"],
    individual: ["individual"],
    cisf: [],
  };
  const allowed = AUDIENCE[session?.role ?? ""] ?? [];
  // Entity-side logins additionally only see notifications tied to their own
  // entity (or broadcast ones with no entityId); oversight roles see all.
  const scoped = ["entity", "others", "individual"].includes(session?.role ?? "");
  const myNotifs = notifications.filter((n) =>
    allowed.includes(n.to) && (!scoped || !n.entityId || n.entityId === session?.entityId));
  const unread = myNotifs.filter((n) => !n.read).length;
  const searchRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl-K focuses the search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const runSearch = () => {
    if (!q.trim()) return;
    nav(`/app/applications?q=${encodeURIComponent(q.trim())}`);
  };

  if (!session) return null;
  const items = NAV_BY_ROLE[session.role];

  return (
    <div className={`shell ${collapsed ? "collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark"><Plane size={18} /></span>
          <span className="brand-text">
            <b>AEP Portal</b>
            <small>COMPLIANTBHARAT · AVIATION</small>
          </span>
        </div>

        <div className="sidebar-role">
          <span className="eyebrow">Signed in as</span>
          <div className="role-chip">{ROLE_LABEL[session.role]}</div>
        </div>

        <nav className="sidebar-nav">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.to === "/app"} className="nav-item">
              <it.icon size={17} />
              <span>{it.label}</span>
              {it.badge ? <span className="nav-badge">{it.badge}</span> : null}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <span className="eyebrow">Governed by</span>
          <div className="mono govern">AVSEC Order 02/2022</div>
          <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => { signOut(); nav("/"); }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setCollapsed((c) => !c)} aria-label="Toggle sidebar">
            {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <div className="topbar-search">
            <Search size={15} />
            <input ref={searchRef} value={q} placeholder="Search applications, entities, zones…"
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runSearch(); if (e.key === "Escape") setQ(""); }} />
            <kbd>⌘K</kbd>
          </div>
          <div className="pillar-legend">
            {PILLARS.map((p) => (
              <span key={p.key} className={`pill tone-${p.key === "MAN" ? "blue" : p.key === "MATERIAL" ? "amber" : "teal"}`}>
                {p.roman} · {p.label}
              </span>
            ))}
          </div>
          <div className="topbar-actions">
            <button className="icon-btn" onClick={toggle} aria-label="Toggle theme">
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <div className="notif-wrap">
              <button className="icon-btn" aria-label="Notifications" onClick={() => { setShowNotifs((s) => !s); if (!showNotifs) markNotificationsRead(); }}>
                <Bell size={17} />{unread > 0 && <span className="notif-badge">{unread}</span>}
              </button>
              {showNotifs && (
                <div className="notif-panel">
                  <div className="notif-head">Notifications <span className="muted">{myNotifs.length}</span></div>
                  <div className="notif-list">
                    {myNotifs.length === 0 && <div className="notif-empty muted">No notifications yet.</div>}
                    {myNotifs.slice(0, 12).map((n) => (
                      <div className={`notif-item ${n.tone}`} key={n.id}>
                        <span className="notif-to mono">{n.to}</span>
                        <div>{n.message}<div className="notif-ts mono">{n.ts}</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="user-chip">
              <span className="avatar">{session.name.slice(0, 1).toUpperCase()}</span>
              <span className="user-meta"><b>{session.name}</b><small>{ROLE_LABEL[session.role]}</small></span>
            </div>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
