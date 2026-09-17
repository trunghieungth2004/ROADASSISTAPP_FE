import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import type { ReactNode } from "react";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Box from "@mui/material/Box";
import BuildIcon from "@mui/icons-material/Build";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import RouteIcon from "@mui/icons-material/Route";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider, useStrings } from "./context/LanguageContext";
import { ProfileProvider, useProfile } from "./context/ProfileContext";
import AdminScreen from "./screens/AdminScreen";
import ErrorBoundary from "./components/ErrorBoundary";
import HazardsScreen from "./screens/HazardsScreen";
import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./screens/LoginScreen";
import MoreScreen from "./screens/MoreScreen";
import RolePickerScreen from "./screens/RolePickerScreen";
import RouteScreen from "./screens/RouteScreen";
import SavedScreen from "./screens/SavedScreen";
import VehicleScreen from "./screens/VehicleScreen";

function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const { loading, user } = useProfile();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (!loading && user?.role !== "1") {
    return <Navigate to="/" replace />;
  }
  return children;
}

function Tabs() {
  const { t } = useStrings();
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  if (!token) {
    return null;
  }
  return (
    <BottomNavigation
      showLabels
      value={location.pathname}
      onChange={(_, value: string) => navigate(value)}
      sx={{ pb: "env(safe-area-inset-bottom)" }}
    >
      <BottomNavigationAction
        label={t.tabs.route}
        value="/route"
        icon={<RouteIcon />}
      />
      <BottomNavigationAction
        label={t.tabs.hazards}
        value="/hazards"
        icon={<WarningAmberIcon />}
      />
      <BottomNavigationAction
        label={`${t.tabs.dispatch} · ${t.tabs.soon}`}
        value="/dispatch"
        icon={<BuildIcon />}
        disabled
      />
      <BottomNavigationAction
        label={t.tabs.vehicle}
        value="/vehicle"
        icon={<TwoWheelerIcon />}
      />
      <BottomNavigationAction
        label={t.tabs.more}
        value="/more"
        icon={<MoreHorizIcon />}
      />
    </BottomNavigation>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ProfileProvider>
            <BrowserRouter>
            <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "100dvh",
              bgcolor: "background.default",
              color: "text.primary",
            }}
          >
            <Box sx={{ position: "relative", flex: 1, minHeight: 0 }}>
              <ErrorBoundary>
                <Routes>
                <Route
                  path="/"
                  element={
                    <RequireAuth>
                      <HomeScreen />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/route"
                  element={
                    <RequireAuth>
                      <RouteScreen />
                    </RequireAuth>
                  }
                />
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
                  path="/vehicle"
                  element={
                    <RequireAuth>
                      <VehicleScreen />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/saved"
                  element={
                    <RequireAuth>
                      <SavedScreen />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/more"
                  element={
                    <RequireAuth>
                      <MoreScreen />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/roles"
                  element={
                    <RequireAuth>
                      <RolePickerScreen />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <RequireAdmin>
                      <AdminScreen />
                    </RequireAdmin>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ErrorBoundary>
            </Box>
            <Tabs />
          </Box>
        </BrowserRouter>
        </ProfileProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
