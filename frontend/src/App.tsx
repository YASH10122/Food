import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import RegisterPage from "./pages/RegisterPage.tsx";
import RestaurantListPage from "./pages/RestaurantListPage.tsx";
import RestaurantMenuPage from "./pages/RestaurantMenuPage.tsx";
import CustomerOrdersPage from "./pages/CustomerOrdersPage.tsx";
import OrderTrackingPage from "./pages/OrderTrackingPage.tsx";
import ManagerDashboardPage from "./pages/ManagerDashboardPage.tsx";
import ManagerMenuPage from "./pages/ManagerMenuPage.tsx";
import DriverDashboardPage from "./pages/DriverDashboardPage.tsx";
import type { AuthState, Role, User } from "./types/index.ts";

function getStoredAuth(): AuthState {
  const token = localStorage.getItem("token");
  const rawUser = localStorage.getItem("user");
  const user = rawUser ? (JSON.parse(rawUser) as User) : null;
  return { token: token || null, user };
}

function roleHome(role: Role): string {
  if (role === "customer") return "/restaurants";
  if (role === "manager") return "/manager/dashboard";
  return "/driver/dashboard";
}

function ProtectedRoute({
  requiredRole,
  children,
}: {
  requiredRole: Role;
  children: React.ReactNode;
}) {
  const loc = useLocation();
  const user = getStoredAuth().user;

  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (user.role !== requiredRole) return <Navigate to={roleHome(user.role)} replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { user } = getStoredAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={roleHome(user.role)} replace />;
}

export default function App() {
  const [auth, setAuth] = useState<AuthState>(() => getStoredAuth());
  const navigate = useNavigate();

  useEffect(() => {
    const sync = () => setAuth(getStoredAuth());
    window.addEventListener("storage", sync);
    window.addEventListener("authChanged", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("authChanged", sync as EventListener);
    };
  }, []);

  const onLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChanged"));
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <Navbar user={auth.user} onLogout={onLogout} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          <Route
            path="/login"
            element={auth.user ? <Navigate to={roleHome(auth.user.role)} replace /> : <LoginPage />}
          />
          <Route
            path="/register"
            element={auth.user ? <Navigate to={roleHome(auth.user.role)} replace /> : <RegisterPage />}
          />

          <Route
            path="/restaurants"
            element={
              <ProtectedRoute requiredRole="customer">
                <RestaurantListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant/:id"
            element={
              <ProtectedRoute requiredRole="customer">
                <RestaurantMenuPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute requiredRole="customer">
                <CustomerOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/order/:orderId/track"
            element={
              <ProtectedRoute requiredRole="customer">
                <OrderTrackingPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/manager/dashboard"
            element={
              <ProtectedRoute requiredRole="manager">
                <ManagerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager/menu"
            element={
              <ProtectedRoute requiredRole="manager">
                <ManagerMenuPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/driver/dashboard"
            element={
              <ProtectedRoute requiredRole="driver">
                <DriverDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

