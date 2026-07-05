import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./app/auth";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Applications from "./pages/Applications";
import Verify from "./pages/Verify";
import AccessControl from "./pages/AccessControl";
import Placeholder from "./pages/Placeholder";
import "./styles/layout.css";

function Protected({ children }: { children: JSX.Element }) {
  const { session } = useAuth();
  return session ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { session } = useAuth();
  return (
    <Routes>
      <Route path="/" element={session ? <Navigate to="/app" replace /> : <Login />} />
      <Route
        path="/app/*"
        element={
          <Protected>
            <Shell>
              <Routes>
                <Route index element={session?.role === "cisf" ? <Navigate to="/app/verify" replace /> : <Dashboard />} />
                <Route path="applications" element={<Applications />} />
                <Route path="applications/:id" element={<Applications />} />
                <Route path="verify" element={<Verify />} />
                <Route path="access" element={<AccessControl />} />
                <Route path="committees" element={<Placeholder title="Committee agenda" note="Committee-ready pool, today-or-forward date scheduling (back-dating blocked), decisions with mandatory reasons." />} />
                <Route path="entities" element={<Placeholder title="Entity onboarding" note="4-step wizard: identity → compliance docs → signatories → job-role → zone-need matrix. One registration serves all pillars." />} />
                <Route path="zones" element={<Placeholder title="Zones & escalation" note="Auto-validation against contract scope + job-role need; hard-block with letterhead escalation to BCAS." />} />
                <Route path="penalties" element={<Placeholder title="Surrenders · penalties" note="Late-surrender auto-detection, entity justification, BCAS penalty with mandatory written justification." />} />
                <Route path="profile" element={<Placeholder title="Entity profile" note="Live compliance status: Security Programme, Clearance, contract validity, NCASP, AOP linkage, dynamic category docs." />} />
                <Route path="users" element={<Placeholder title="Users & roles" note="Admin role builder — per-vertical C/R/U/D grid; every grant stores a governing policy reference." />} />
                <Route path="audit" element={<Placeholder title="Audit log" note="Append-only trail: actor, action, object, before/after, timestamp. Visible to Admin and BCAS." />} />
                <Route path="*" element={<Navigate to="/app" replace />} />
              </Routes>
            </Shell>
          </Protected>
        }
      />
    </Routes>
  );
}
