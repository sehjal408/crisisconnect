import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MapPage from "./pages/citizen/MapPage";
import CitizenRequestsPage from "./pages/citizen/RequestsPage";
import VolunteerDashboardPage from "./pages/volunteer/DashboardPage";
import AdminDashboardPage from "./pages/admin/DashboardPage";
import AdminRequestsPage from "./pages/admin/RequestsPage";
import AdminSheltersPage from "./pages/admin/SheltersPage";
import AdminIncidentsPage from "./pages/admin/IncidentsPage";
import AdminInsightsPage from "./pages/admin/InsightsPage";
import AdminVolunteersPage from "./pages/admin/VolunteersPage";
import CommandCenterPage from "./pages/admin/CommandCenterPage";
import ProfilePage from "./pages/ProfilePage";

const HOME_BY_ROLE = { citizen: "/map", volunteer: "/volunteer", admin: "/admin" };

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={HOME_BY_ROLE[user.role] || "/login"} replace />;
}

const guard = (roles, el) => <ProtectedRoute roles={roles}>{el}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Any signed-in user */}
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

      {/* Citizen */}
      <Route path="/map" element={guard(["citizen"], <MapPage />)} />
      <Route path="/requests" element={guard(["citizen"], <CitizenRequestsPage />)} />

      {/* Volunteer */}
      <Route path="/volunteer" element={guard(["volunteer"], <VolunteerDashboardPage />)} />

      {/* Admin */}
      <Route path="/admin" element={guard(["admin"], <AdminDashboardPage />)} />
      <Route path="/admin/requests" element={guard(["admin"], <AdminRequestsPage />)} />
      <Route path="/admin/shelters" element={guard(["admin"], <AdminSheltersPage />)} />
      <Route path="/admin/incidents" element={guard(["admin"], <AdminIncidentsPage />)} />
      <Route path="/admin/volunteers" element={guard(["admin"], <AdminVolunteersPage />)} />
      <Route path="/admin/insights" element={guard(["admin"], <AdminInsightsPage />)} />
      <Route path="/admin/command" element={guard(["admin"], <CommandCenterPage />)} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
