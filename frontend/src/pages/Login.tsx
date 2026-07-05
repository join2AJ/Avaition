import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Plane, ShieldCheck } from "lucide-react";
import { useAuth } from "@/app/auth";
import { ROLES } from "@/domain/roles";
import { PILLARS } from "@/domain/types";
import type { Role } from "@/domain/types";

// Combo options — note the two distinct admin logins (Operator-Admin vs
// BCAS-Admin), plus every other login. Both admins map to the admin role.
const LOGIN_OPTIONS: { id: string; role: Role; label: string }[] = [
  { id: "admin-operator", role: "admin", label: "Admin — Airport Operator" },
  { id: "admin-bcas", role: "admin", label: "Admin — BCAS" },
  { id: "bcas", role: "bcas", label: "BCAS Officer" },
  { id: "operator", role: "operator", label: "Pass Section — Operator" },
  { id: "entity", role: "entity", label: "Entity" },
  { id: "others", role: "others", label: "Others — Contractor / Govt" },
  { id: "cisf", role: "cisf", label: "CISF — Gate Verification" },
  { id: "individual", role: "individual", label: "Individual — Self-check" },
];

export default function Login() {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const [active, setActive] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("admin-operator");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const go = (role: Role, displayName?: string) => {
    signIn({
      role,
      name: displayName || name.trim() || defaultName(role),
      entityId: role === "entity" || role === "individual" ? "ENT-01" : undefined,
    });
    nav(role === "cisf" ? "/app/verify" : "/app");
  };

  const signInCombo = () => {
    const opt = LOGIN_OPTIONS.find((o) => o.id === loginId)!;
    // Demo: any username/password is accepted; the display name reflects the
    // chosen login (e.g. the two admin kinds are distinguishable in the audit).
    const display = username.trim() || opt.label;
    go(opt.role, opt.id === "admin-bcas" ? `BCAS Admin` : opt.id === "admin-operator" ? "Operator Admin" : display);
  };

  return (
    <div className="login">
      <div className="login-inner">
        <header className="login-head">
          <span className="login-mark"><Plane size={22} /></span>
          <div>
            <h1>AEP Portal</h1>
            <p className="eyebrow">COMPLIANTBHARAT · AVIATION · COMPLIANCE INTELLIGENCE</p>
          </div>
        </header>
        <p className="login-sub">Airport Entry Permit management under BCAS AEP Guidelines 02/2022</p>
        <div className="login-pillars">
          {PILLARS.map((p) => (
            <span key={p.key} className={`pill tone-${p.key === "MAN" ? "blue" : p.key === "MATERIAL" ? "amber" : "teal"}`}>
              {p.roman} · {p.label.toUpperCase()}
            </span>
          ))}
        </div>

        <div className="login-combo card card-pad">
          <div className="combo-row">
            <label className="fld"><span className="fld-l">Login as</span>
              <select className="field" value={loginId} onChange={(e) => setLoginId(e.target.value)}>
                {LOGIN_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select></label>
            <label className="fld"><span className="fld-l">Username</span>
              <input className="field" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} /></label>
            <label className="fld"><span className="fld-l">Password</span>
              <input className="field" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && signInCombo()} /></label>
            <button className="btn btn-brand combo-btn" onClick={signInCombo}>Sign in <ArrowRight size={15} /></button>
          </div>
        </div>

        <p className="eyebrow login-select">Or use a direct login (demo)</p>
        <div className="role-grid">
          {ROLES.map((r) => (
            <button
              key={r.key}
              className={`role-card ${active === r.key ? "active" : ""}`}
              style={{ ["--accent" as string]: r.accent }}
              onClick={() => setActive(r.key)}
            >
              <span className="role-tag" style={{ color: r.accent }}>{r.tag}</span>
              <h3>{r.title}</h3>
              <p>{r.blurb}</p>
              <span className="role-signin" style={{ color: r.accent }} onClick={(e) => { e.stopPropagation(); go(r.key); }}>
                SIGN IN <ArrowRight size={13} />
              </span>
            </button>
          ))}
        </div>

        <div className="login-individual card card-pad">
          <div className="li-head"><ShieldCheck size={16} /> <b>Individual self-check</b></div>
          <p className="muted">Registered pass-holders may check their own application status if authorized by their entity.</p>
          <div className="li-form">
            <input className="field" placeholder="AEP number or registered name" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn btn-ink" onClick={() => go("individual")}>Check status</button>
          </div>
        </div>

        <p className="login-foot mono">2FA + account lock after 5 failures · sessions audit-logged [Clause TBD — identity assurance]</p>
      </div>
    </div>
  );
}

function defaultName(role: Role): string {
  return {
    admin: "Portal Administrator", bcas: "BCAS Officer", operator: "Pass Section Staff",
    cisf: "CISF Gate Officer", entity: "GHA-Delta Ground Services", others: "Contractor User", individual: "R. Sharma",
  }[role];
}
