import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Bell, LogOut, Moon, Plane, Search, Sun, PanelLeftClose, PanelLeft } from "lucide-react";
import { useAuth } from "@/app/auth";
import { useTheme } from "@/app/theme";
import { NAV_BY_ROLE } from "@/app/nav";
import { ROLE_LABEL } from "@/domain/roles";
import { PILLARS } from "@/domain/types";

export default function Shell({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
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
            <input placeholder="Search applications, entities, zones…" />
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
            <button className="icon-btn" aria-label="Notifications"><Bell size={17} /><span className="dot" /></button>
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
