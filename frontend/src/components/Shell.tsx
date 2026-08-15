import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut, Moon, Plane, Search, Sun, Menu, X, ChevronDown } from "lucide-react";
import { useAuth } from "@/app/auth";
import { useTheme } from "@/app/theme";
import { useData } from "@/app/data";
import { groupNavItems, type NavGroup } from "@/app/nav";
import { ROLE_LABEL } from "@/domain/roles";

export default function Shell({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { markNotificationsRead, visibleNav, notificationsFor } = useData();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [q, setQ] = useState("");
  const myNotifs = session ? notificationsFor(session.role, session.entityId) : [];
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

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const runSearch = () => {
    if (!q.trim()) return;
    nav(`/app/applications?q=${encodeURIComponent(q.trim())}`);
  };

  if (!session) return null;
  const groups = groupNavItems(visibleNav(session.role));
  const isActiveGroup = (g: NavGroup) =>
    g.items.some((it) => (it.to === "/app" ? pathname === "/app" : pathname === it.to || pathname.startsWith(it.to + "/")));

  return (
    <div className={`app-shell ${mobileOpen ? "menu-open" : ""}`}>
      <header className="appheader">
        <div className="appbar">
          <div className="appbar-brand" onClick={() => nav("/app")} role="button" tabIndex={0}>
            <span className="brand-mark"><Plane size={17} /></span>
            <span className="brand-text"><b>AEP Portal</b><small>COMPLIANTBHARAT · AVIATION</small></span>
          </div>

          <div className="topbar-search appbar-search">
            <Search size={15} />
            <input ref={searchRef} value={q} placeholder="Search applications, entities, zones…"
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runSearch(); if (e.key === "Escape") setQ(""); }} />
            <kbd>⌘K</kbd>
          </div>

          <div className="appbar-actions">
            <span className="role-chip appbar-role">{ROLE_LABEL[session.role]}</span>
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
                    {myNotifs.slice(0, 10).map((n) => (
                      <div className={`notif-item ${n.tone}`} key={n.id}>
                        <span className="notif-to mono">{n.to}</span>
                        <div>{n.message}<div className="notif-ts mono">{n.source ? `${n.source} · ` : ""}{n.ts}</div></div>
                      </div>
                    ))}
                  </div>
                  <button className="notif-viewall" onClick={() => { setShowNotifs(false); nav("/app/notifications"); }}>View all notifications →</button>
                </div>
              )}
            </div>
            <div className="user-chip">
              <span className="avatar">{session.name.slice(0, 1).toUpperCase()}</span>
              <span className="user-meta"><b>{session.name}</b><small>{ROLE_LABEL[session.role]}</small></span>
            </div>
            <button className="icon-btn signout-btn" onClick={() => { signOut(); nav("/"); }} aria-label="Sign out"><LogOut size={16} /></button>
            <button className="icon-btn hamburger" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={19} /></button>
          </div>
        </div>

        {/* Desktop grouped menu bar */}
        <nav className="navbar">
          {groups.map((g) => {
            if (g.items.length === 1) {
              const only = g.items[0];
              const Icon = only.icon;
              return (
                <NavLink key={g.label} to={only.to} end={only.to === "/app"}
                  className={({ isActive }) => `navgroup-btn ${isActive ? "active" : ""}`}>
                  <Icon size={15} /> {only.label}
                </NavLink>
              );
            }
            return (
              <div key={g.label} className={`navgroup ${isActiveGroup(g) ? "active" : ""}`}>
                <button className="navgroup-btn" type="button">{g.label} <ChevronDown size={14} /></button>
                <div className="navmenu">
                  {g.items.map((it) => {
                    const Icon = it.icon;
                    return (
                      <NavLink key={it.to} to={it.to} end={it.to === "/app"}
                        className={({ isActive }) => `navmenu-item ${isActive ? "active" : ""}`}>
                        <Icon size={16} /> <span>{it.label}</span>
                        {it.badge ? <span className="nav-badge">{it.badge}</span> : null}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && <div className="mobile-scrim" onClick={() => setMobileOpen(false)} />}
      <aside className="mobile-menu" aria-hidden={!mobileOpen}>
        <div className="mm-head">
          <span className="brand-text"><b>Menu</b><small>{ROLE_LABEL[session.role]}</small></span>
          <button className="icon-btn" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        {groups.map((g) => (
          <div key={g.label} className="mm-group">
            <div className="mm-group-label">{g.label}</div>
            {g.items.map((it) => {
              const Icon = it.icon;
              return (
                <NavLink key={it.to} to={it.to} end={it.to === "/app"}
                  className={({ isActive }) => `mm-item ${isActive ? "active" : ""}`}>
                  <Icon size={17} /> <span>{it.label}</span>
                  {it.badge ? <span className="nav-badge">{it.badge}</span> : null}
                </NavLink>
              );
            })}
          </div>
        ))}
        <button className="btn btn-ghost mm-signout" onClick={() => { signOut(); nav("/"); }}><LogOut size={15} /> Sign out</button>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
