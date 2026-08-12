import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Plane } from "lucide-react";
import { useAuth } from "@/app/auth";
import { PILLARS } from "@/domain/types";
import type { Role } from "@/domain/types";

// Single sign-on: one form for the whole portal. The dropdown carries every
// login (both admin kinds, BCAS, Pass Section, Entity, Others, CISF gate and
// Individual self-check), so there is exactly one entry point to the database.
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
  const [loginId, setLoginId] = useState("admin-operator");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const signInCombo = () => {
    const opt = LOGIN_OPTIONS.find((o) => o.id === loginId)!;
    // Demo: any username/password is accepted; the display name reflects the
    // chosen login (the two admin kinds stay distinguishable in the audit).
    const display = username.trim() || opt.label;
    const name =
      opt.id === "admin-bcas" ? "BCAS Admin" : opt.id === "admin-operator" ? "Operator Admin" : display;
    signIn({
      role: opt.role,
      name,
      entityId: opt.role === "entity" || opt.role === "individual" ? "ENT-01" : undefined,
    });
    nav(opt.role === "cisf" ? "/app/verify" : "/app");
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

        <p className="login-foot mono">2FA + account lock after 5 failures · sessions audit-logged [Clause TBD — identity assurance]</p>
      </div>
    </div>
  );
}
