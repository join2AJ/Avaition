import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./app/auth";
import { canAccess, homeFor } from "./app/nav";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Compliance from "./pages/Compliance";
import Applications from "./pages/Applications";
import Create from "./pages/Create";
import Checklist from "./pages/Checklist";
import Verify from "./pages/Verify";
import AccessControl from "./pages/AccessControl";
import ZoneAccess from "./pages/ZoneAccess";
import ValidityMatrix from "./pages/ValidityMatrix";
import EntityStatus from "./pages/EntityStatus";
import Contracts from "./pages/Contracts";
import StopList from "./pages/StopList";
import Committees from "./pages/Committees";
import Zones from "./pages/Zones";
import EntityOnboarding from "./pages/EntityOnboarding";
import Penalties from "./pages/Penalties";
import Users from "./pages/Users";
import Audit from "./pages/Audit";
import Placeholder from "./pages/Placeholder";
import "./styles/layout.css";

function Protected({ children }: { children: JSX.Element }) {
  const { session } = useAuth();
  return session ? children : <Navigate to="/" replace />;
}

/** Per-role route authorization — blocks URL access to pages outside a role's scope. */
function RouteGuard({ children }: { children: JSX.Element }) {
  const { session } = useAuth();
  const { pathname } = useLocation();
  if (session && !canAccess(session.role, pathname)) {
    return <Navigate to={homeFor(session.role)} replace />;
  }
  return children;
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
              <RouteGuard>
              <Routes>
                <Route index element={session?.role === "cisf" ? <Navigate to="/app/verify" replace /> : <Dashboard />} />
                <Route path="compliance" element={<Compliance />} />
                <Route path="create" element={<Create />} />
                <Route path="checklist" element={<Checklist />} />
                <Route path="applications" element={<Applications />} />
                <Route path="applications/:id" element={<Applications />} />
                <Route path="verify" element={<Verify />} />
                <Route path="access" element={<AccessControl />} />
                <Route path="zone-access" element={<ZoneAccess />} />
                <Route path="validity" element={<ValidityMatrix />} />
                <Route path="status" element={<EntityStatus />} />
                <Route path="contracts" element={<Contracts />} />
                <Route path="stop-list" element={<StopList />} />
                <Route path="committees" element={<Committees />} />
                <Route path="entities" element={<EntityOnboarding />} />
                <Route path="zones" element={<Zones />} />
                <Route path="penalties" element={<Penalties />} />
                <Route path="profile" element={<Placeholder title="Entity profile" note="Live compliance status: Security Programme, Clearance, contract validity, NCASP, AOP linkage, dynamic category docs." />} />
                <Route path="users" element={<Users />} />
                <Route path="audit" element={<Audit />} />
                <Route path="*" element={<Navigate to="/app" replace />} />
              </Routes>
              </RouteGuard>
            </Shell>
          </Protected>
        }
      />
    </Routes>
  );
}
