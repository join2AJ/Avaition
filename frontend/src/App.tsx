import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./app/auth";
import { useData } from "./app/data";
import { homeFor } from "./app/nav";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Compliance from "./pages/Compliance";
import Applications from "./pages/Applications";
import Tot from "./pages/Tot";
import Create from "./pages/Create";
import Verify from "./pages/Verify";
import ZoneAccess from "./pages/ZoneAccess";
import ValidityMatrix from "./pages/ValidityMatrix";
import EntityStatus from "./pages/EntityStatus";
import Contracts from "./pages/Contracts";
import StopList from "./pages/StopList";
import Committees from "./pages/Committees";
import Information from "./pages/Information";
import Notifications from "./pages/Notifications";
import Penalties from "./pages/Penalties";
import Users from "./pages/Users";
import DatabasePage from "./pages/Database";
import SqlConsole from "./pages/SqlConsole";
import Audit from "./pages/Audit";
import Placeholder from "./pages/Placeholder";
import "./styles/layout.css";

function Protected({ children }: { children: JSX.Element }) {
  const { session } = useAuth();
  return session ? children : <Navigate to="/" replace />;
}

/** Per-role route authorization — blocks URL access to pages outside a role's
 *  scope, including any tab an Admin has hidden via access control. */
function RouteGuard({ children }: { children: JSX.Element }) {
  const { session } = useAuth();
  const { canSee, visibleNav } = useData();
  const { pathname } = useLocation();
  if (session && !canSee(session.role, pathname)) {
    const home = visibleNav(session.role)[0]?.to ?? homeFor(session.role);
    return <Navigate to={home} replace />;
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
                <Route path="applications" element={<Applications />} />
                <Route path="applications/:id" element={<Applications />} />
                <Route path="tot" element={<Tot />} />
                <Route path="material" element={<Navigate to="/app/tot" replace />} />
                <Route path="verify" element={<Verify />} />
                <Route path="zone-access" element={<ZoneAccess />} />
                <Route path="validity" element={<ValidityMatrix />} />
                <Route path="status" element={<EntityStatus />} />
                <Route path="contracts" element={<Contracts />} />
                <Route path="stop-list" element={<StopList />} />
                <Route path="committees" element={<Committees />} />
                <Route path="information" element={<Information />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="penalties" element={<Penalties />} />
                <Route path="profile" element={<Placeholder title="Entity profile" note="Live compliance status: Security Programme, Clearance, contract validity, NCASP, AOP linkage, dynamic category docs." />} />
                <Route path="users" element={<Users />} />
                <Route path="database" element={<DatabasePage />} />
                <Route path="sql" element={<SqlConsole />} />
                <Route path="audit" element={<Audit />} />
                {/* Legacy paths → new homes */}
                <Route path="checklist" element={<Navigate to="/app/information" replace />} />
                <Route path="zones" element={<Navigate to="/app/information" replace />} />
                <Route path="entities" element={<Navigate to="/app/create" replace />} />
                <Route path="access" element={<Navigate to="/app/users" replace />} />
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
