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
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
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
import ProvidersScreen from "./screens/ProvidersScreen";
import BillsScreen from "./screens/BillsScreen";
import BillDetailScreen from "./screens/BillDetailScreen";
import WarrantyClaimsScreen from "./screens/WarrantyClaimsScreen";
import DiagnosticsScreen from "./screens/DiagnosticsScreen";
import AssistScreen from "./screens/AssistScreen";
import LandingScreen from "./screens/LandingScreen";
import TrackingScreen from "./screens/TrackingScreen";
import BookingScreen from "./screens/BookingScreen";
import ProviderJobsScreen from "./screens/provider/ProviderJobsScreen";
import ProviderBookingsScreen from "./screens/provider/ProviderBookingsScreen";
import SupportScreen from "./screens/SupportScreen";

function RequireRider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const { loading, user } = useProfile();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (!loading && user?.role === "1") {
    return <Navigate to="/admin" replace />;
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

function RootScreen() {
  const { token } = useAuth();
  const { loading, user } = useProfile();
  if (!token) {
    return <LandingScreen />;
  }
  if (loading) {
    return null;
  }
  if (user?.role === "1") {
    return <Navigate to="/admin" replace />;
  }
  return <HomeScreen />;
}

function WelcomeScreen() {
  const { token } = useAuth();
  return token ? <Navigate to="/" replace /> : <LandingScreen />;
}

function Tabs() {
  const { t } = useStrings();
  const { token } = useAuth();
  const { user } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  if (
    !token ||
    user?.role === "1" ||
    location.pathname === "/welcome" ||
    location.pathname.startsWith("/admin")
  ) {
    return null;
  }
  const navValue = location.pathname.startsWith("/provider/") ?
    "/more" :
    location.pathname;
  return (
    <>
    <BottomNavigation
      showLabels
      value={navValue}
      onChange={(_, value: string) => {
        navigate(value);
      }}
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
        label={t.tabs.dispatch}
        value="/dispatch"
        icon={<BuildIcon />}
      />
      <BottomNavigationAction
        label={t.tabs.booking}
        value="/bookings"
        icon={<EventAvailableIcon />}
      />
      <BottomNavigationAction
        label={t.tabs.more}
        value="/more"
        icon={<MoreHorizIcon />}
      />
    </BottomNavigation>
    </>
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
                  element={<RootScreen />}
                />
                <Route path="/welcome" element={<WelcomeScreen />} />
                <Route
                  path="/route"
                  element={
                    <RequireRider>
                      <RouteScreen />
                    </RequireRider>
                  }
                />
                <Route path="/login" element={<LoginScreen />} />
                <Route
                  path="/hazards"
                  element={
                    <RequireRider>
                      <HazardsScreen />
                    </RequireRider>
                  }
                />
                <Route
                  path="/vehicle"
                  element={
                    <RequireRider>
                      <VehicleScreen />
                    </RequireRider>
                  }
                />
                <Route
                  path="/saved"
                  element={
                    <RequireRider>
                      <SavedScreen />
                    </RequireRider>
                  }
                />
                <Route
                  path="/more"
                  element={
                    <RequireRider>
                      <MoreScreen />
                    </RequireRider>
                  }
                />
                <Route
                  path="/roles"
                  element={
                    <RequireRider>
                      <RolePickerScreen />
                    </RequireRider>
                  }
                />
                <Route
                  path="/dispatch"
                  element={
                    <RequireRider>
                      <AssistScreen />
                    </RequireRider>
                  }
                />
                <Route
                  path="/providers"
                  element={
                    <RequireRider>
                      <ProvidersScreen />
                    </RequireRider>
                  }
                />
                <Route
                  path="/bookings"
                  element={
                    <RequireRider>
                      <BookingScreen />
                    </RequireRider>
                  }
                />
                <Route
                  path="/provider/jobs"
                  element={
                    <RequireRider>
                      <ProviderJobsScreen />
                    </RequireRider>
                  }
                />
                <Route
                  path="/provider/bookings"
                  element={
                    <RequireRider>
                      <ProviderBookingsScreen />
                    </RequireRider>
                  }
                />
                <Route
                  path="/bills"
                  element={
                    <RequireRider>
                      <BillsScreen />
                    </RequireRider>
                  }
                />
                <Route
                  path="/bills/:ticketId"
                  element={
                    <RequireRider>
                      <BillDetailScreen />
                    </RequireRider>
                  }
                />
                <Route
                  path="/warranty"
                  element={
                    <RequireRider>
                      <WarrantyClaimsScreen />
                    </RequireRider>
                  }
                />
                <Route
                  path="/support"
                  element={
                    <RequireRider>
                      <SupportScreen />
                    </RequireRider>
                  }
                />
                <Route
                  path="/diagnostics"
                  element={
                    <RequireRider>
                      <DiagnosticsScreen />
                    </RequireRider>
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
                <Route path="/track/:token" element={<TrackingScreen />} />
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
