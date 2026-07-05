import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./app/auth";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Applications from "./pages/Applications";
import Create from "./pages/Create";
import Checklist from "./pages/Checklist";
import Verify from "./pages/Verify";
import AccessControl from "./pages/AccessControl";
import ZoneAccess from "./pages/ZoneAccess";
import ValidityMatrix from "./pages/ValidityMatrix";
import EntityStatus from "./pages/EntityStatus";
import Contracts from "./pages/Contracts";
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
                <Route path="committees" element={<Committees />} />
                <Route path="entities" element={<EntityOnboarding />} />
                <Route path="zones" element={<Zones />} />
                <Route path="penalties" element={<Penalties />} />
                <Route path="profile" element={<Placeholder title="Entity profile" note="Live compliance status: Security Programme, Clearance, contract validity, NCASP, AOP linkage, dynamic category docs." />} />
                <Route path="users" element={<Users />} />
                <Route path="audit" element={<Audit />} />
                <Route path="*" element={<Navigate to="/app" replace />} />
              </Routes>
            </Shell>
          </Protected>
        }
      />
    </Routes>
  );
}
