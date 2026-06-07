import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LangProvider } from "./context/LangContext";

import Navbar from "./components/Navbar";
import LandingPage from "./pages/Landing/LandingPage";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import FarmerDashboard from "./pages/Farmer/FarmerDashboard";
import AgentDashboard from "./pages/Agent/AgentDashboard";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import Marketplace from "./pages/Marketplace/Marketplace";

// Protected route wrapper
function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loader-wrapper" style={{ minHeight: "100vh" }}>
      <div className="loader"></div>
      <p className="loader-text">Loading Rythu Sethu...</p>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"           element={<LandingPage />} />
        <Route path="/login"      element={<Login />} />
        <Route path="/register"   element={<Register />} />
        <Route path="/marketplace" element={<Marketplace />} />

        <Route path="/farmer" element={
          <Protected roles={["farmer", "admin"]}>
            <FarmerDashboard />
          </Protected>
        } />

        <Route path="/agent" element={
          <Protected roles={["agent", "admin"]}>
            <AgentDashboard />
          </Protected>
        } />

        <Route path="/admin" element={
          <Protected roles={["admin"]}>
            <AdminDashboard />
          </Protected>
        } />

        {/* Legacy paths redirect */}
        <Route path="/farmer-dashboard"  element={<Navigate to="/farmer" replace />} />
        <Route path="/agent-dashboard"   element={<Navigate to="/agent" replace />} />
        <Route path="/admin-dashboard"   element={<Navigate to="/admin" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </LangProvider>
  );
}