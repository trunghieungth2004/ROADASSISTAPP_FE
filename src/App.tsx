import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
} from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider, useStrings } from "./context/LanguageContext";
import DispatchScreen from "./screens/DispatchScreen";
import HazardsScreen from "./screens/HazardsScreen";
import LoginScreen from "./screens/LoginScreen";
import RouteScreen from "./screens/RouteScreen";
import VehicleScreen from "./screens/VehicleScreen";

function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function Tabs() {
  const { t } = useStrings();
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex-1 py-2 text-center text-xs font-medium ${
      isActive ? "text-green-700" : "text-neutral-500"
    }`;
  return (
    <nav className="flex border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <NavLink to="/" end className={link}>
        {t.tabs.map}
      </NavLink>
      <NavLink to="/hazards" className={link}>
        {t.tabs.hazards}
      </NavLink>
      <NavLink to="/dispatch" className={link}>
        {t.tabs.dispatch}
      </NavLink>
      <NavLink to="/vehicle" className={link}>
        {t.tabs.vehicle}
      </NavLink>
    </nav>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="flex h-dvh flex-col bg-neutral-100 text-neutral-900">
            <div className="relative min-h-0 flex-1">
              <Routes>
                <Route path="/" element={<RouteScreen />} />
                <Route path="/login" element={<LoginScreen />} />
                <Route
                  path="/hazards"
                  element={
                    <RequireAuth>
                      <HazardsScreen />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/dispatch"
                  element={
                    <RequireAuth>
                      <DispatchScreen />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/vehicle"
                  element={
                    <RequireAuth>
                      <VehicleScreen />
                    </RequireAuth>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            <Tabs />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
