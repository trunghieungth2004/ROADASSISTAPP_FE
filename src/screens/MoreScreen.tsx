import { formatDateDMY } from "../utils/date";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import LinearProgress from "@mui/material/LinearProgress";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import BuildIcon from "@mui/icons-material/Build";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import DownloadIcon from "@mui/icons-material/Download";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import HandymanIcon from "@mui/icons-material/Handyman";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Card from "@mui/material/Card";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import InsightsIcon from "@mui/icons-material/Insights";
import StorefrontIcon from "@mui/icons-material/Storefront";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import TranslateIcon from "@mui/icons-material/Translate";
import TuneIcon from "@mui/icons-material/Tune";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import GavelIcon from "@mui/icons-material/Gavel";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import { useColorScheme } from "@mui/material/styles";
import { toMessage } from "../api/client";
import {
  getNotificationPrefs,
  updateNotificationPrefs,
  type NotificationPrefs,
} from "../api/notifications";
import { updateProfile } from "../api/users";
import { MOBILE_RELEASES_URL, MOBILE_REPO_URL } from "../components/AssistCtaDialog";
import ListCard from "../components/ui/ListCard";
import ListRow from "../components/ui/ListRow";
import ProfileHeader from "../components/ui/ProfileHeader";
import Screen from "../components/ui/Screen";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { useStrings } from "../context/LanguageContext";
import { vehicleTypeLabel } from "../i18n/labels";
import { myBills, type Bill } from "../api/bills";
import { shopBookings, type Booking } from "../api/bookings";
import { userRatings } from "../api/ratings";
import { fetchMyProviders, providerStats as fetchProviderStats, type Provider, type ProviderStats } from "../api/providers";
import {
  eligibleAppeals,
  fileAppeal,
  type AppealItem,
  type AppealReason,
  type EligibleAppeals,
} from "../api/appeals";
import { updateProvider } from "../api/providers";
import { buildProviderDashboard, buildRiderDashboard } from "./more/dashboardData";
import DashboardDialog from "./more/DashboardDialog";
import { profileRoleLabel, profileServiceKinds } from "./more/profileKinds";

export default function MoreScreen() {
  const { t, lang, toggle } = useStrings();
  const { signOut, token } = useAuth();
  const { user, activeVehicle, refresh } = useProfile();
  const navigate = useNavigate();
  const { mode, setMode } = useColorScheme();
  const dark = mode === "dark";
  const [editOpen, setEditOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [dashboardMode, setDashboardMode] = useState<"RIDER" | "PROVIDER">("RIDER");
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [stats, setStats] = useState<ProviderStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rating, setRating] = useState({avg: 0, count: 0});
  const [eligible, setEligible] = useState<EligibleAppeals | null>(null);
  const [appealFor, setAppealFor] = useState<AppealItem | null>(null);
  const [appealReason, setAppealReason] = useState<AppealReason>("OTHER");
  const [appealNote, setAppealNote] = useState("");
  const [appealBusy, setAppealBusy] = useState(false);
  const [dutyBusy, setDutyBusy] = useState(false);
  const appealItems = eligible ?
    [...eligible.ratings, ...eligible.reports, ...eligible.disputes] :
    [];
  const openAppeal = appealItems.some((item) => item.appealStatus === "OPEN");
  const restricted = user?.bookingBlocked === true ||
    (typeof user?.restrictedUntil === "string" &&
      Date.parse(user.restrictedUntil) > Date.now());

  const displayName = user?.displayName || user?.email || "—";
  const services = user?.services ?? [];
  const isAdmin = user?.role === "1";

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!token) {
      setEligible(null);
      return;
    }
    void eligibleAppeals(token).then(setEligible).catch(() => setEligible(null));
  }, [token]);
  useEffect(() => {
    if (!token) {
      setBills([]);
      setProviders([]);
      setStats(null);
      setBookings([]);
      setRating({avg: 0, count: 0});
      return;
    }
    void myBills(token).then((rows) => setBills(Array.isArray(rows) ? rows : [])).catch(() => setBills([]));
    void fetchProviderStats(token).then(setStats).catch(() => setStats(null));
    if (user?.id) {
      void userRatings(user.id, "RIDER", undefined, token)
        .then((result) => setRating({avg: result.avg, count: result.count}))
        .catch(() => setRating({avg: 0, count: 0}));
    }
    void fetchMyProviders(token).then(async (rows) => {
      setProviders(rows);
      const shops = rows.filter((row) => row.kind === "SHOP");
      const groups = await Promise.all(shops.map((shop) =>
        shopBookings(shop.id, token)
          .then((result) => result.bookings)
          .catch(() => [] as Booking[])));
      const unique = new Map<string, Booking>();
      for (const group of groups) {
        for (const row of group) unique.set(row.id, row);
      }
      setBookings([...unique.values()]);
    }).catch(() => {
      setProviders([]);
      setBookings([]);
    });
  }, [token, user?.id]);

  function openEdit() {
    setNameDraft(user?.displayName ?? "");
    setEditError(null);
    setEditOpen(true);
  }

  async function openNotifications() {
    setNotifOpen(true);
    if (!token) return;
    setNotifBusy(true);
    try {
      setPrefs(await getNotificationPrefs(token));
    } catch (err) {
      setEditError(toMessage(err));
    } finally {
      setNotifBusy(false);
    }
  }

  async function savePrefs(patch: Partial<NotificationPrefs>) {
    if (!token || !prefs) return;
    setNotifBusy(true);
    try {
      setPrefs(await updateNotificationPrefs(patch, token));
    } catch (err) {
      setEditError(toMessage(err));
    } finally {
      setNotifBusy(false);
    }
  }

  async function onSaveName() {
    if (!token || !nameDraft.trim() || nameBusy) return;
    setEditError(null);
    setNameBusy(true);
    try {
      await updateProfile({ displayName: nameDraft.trim() }, token);
      await refresh();
      setEditOpen(false);
    } catch (err) {
      setEditError(toMessage(err));
    } finally {
      setNameBusy(false);
    }
  }

  function serviceLabel(service: string): string {
    if (service === "RIDER") return t.roles.rider;
    if (service === "SHOP") return t.roles.shop;
    if (service === "TOW") return t.roles.tow;
    if (service === "MOBILE_SHOP") return t.roles.mobileShop;
    return service;
  }

  function toggleTheme() {
    const next = dark ? "light" : "dark";
    setMode(next);
    try {
      localStorage.setItem("roadassist.theme", next);
    } catch {
      return;
    }
  }

  async function toggleDuty(provider: Provider): Promise<void> {
    if (!token || dutyBusy ||
      provider.status !== "ACTIVE" ||
      provider.suspended === true) {
      return;
    }
    setDutyBusy(true);
    setEditError(null);
    try {
      await updateProvider({
        providerId: provider.id,
        accepting: provider.accepting !== true,
      }, token);
      setProviders(await fetchMyProviders(token));
    } catch (err) {
      setEditError(toMessage(err));
    } finally {
      setDutyBusy(false);
    }
  }

  async function submitAppeal(): Promise<void> {
    if (!token || !appealFor || appealBusy || appealNote.trim().length < 1) {
      return;
    }
    setAppealBusy(true);
    setEditError(null);
    try {
      await fileAppeal({
        subjectKind: appealFor.subjectKind,
        subjectId: appealFor.subjectId,
        reason: appealReason as "OTHER",
        note: appealNote.trim(),
      }, token);
      setAppealFor(null);
      setAppealNote("");
      setEligible(await eligibleAppeals(token));
    } catch (err) {
      setEditError(toMessage(err));
    } finally {
      setAppealBusy(false);
    }
  }
  const hasProviderRole = services.some((service) =>
    service === "SHOP" || service === "TOW" || service === "MOBILE_SHOP") ||
    providers.length > 0;
  const shopProviders = providers.filter((row) =>
    row.kind === "SHOP" && row.status === "ACTIVE" && row.suspended !== true);
  const profileKinds = profileServiceKinds(services, providers);
  const riderDashboard = useMemo(() => buildRiderDashboard({
    bills,
    rating,
    t,
    lang,
  }), [bills, rating, t, lang]);
  const providerDashboard = useMemo(() => buildProviderDashboard({
    stats,
    bookings,
    t,
    lang,
  }), [stats, bookings, t, lang]);
  const currentDashboard = dashboardMode === "RIDER" ? riderDashboard : providerDashboard;
  return (
    <Screen>
      <ProfileHeader
        name={displayName}
        email={user?.email ?? ""}
        roleLabel={profileRoleLabel(services, isAdmin, t)}
        services={profileKinds.map(serviceLabel)}
        onEdit={openEdit}
      />
      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">{t.more.trust}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>{user?.trustScore ?? 0}</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, Math.max(0, user?.trustScore ?? 0))}
            color={(user?.trustScore ?? 0) >= 70 ? "success" : (user?.trustScore ?? 0) >= 40 ? "warning" : "error"}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">{t.more.standing}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>{user?.standingScore ?? 100}</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, Math.max(0, user?.standingScore ?? 100))}
            color={(user?.standingScore ?? 100) >= 60 ? "success" : (user?.standingScore ?? 100) >= 50 ? "warning" : "error"}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      </Box>
      {user?.bookingBlocked || user?.restrictedUntil ? (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {t.more.restricted}
          </Typography>
          <Typography variant="caption">
            {[
              user?.restrictedUntil ?
                `${t.more.restrictedUntil}: ${formatDateDMY(user.restrictedUntil)}` :
                null,
              user?.restrictionReason ?? null,
            ].filter((part): part is string => Boolean(part)).join(" · ")}
          </Typography>
        </Alert>
      ) : null}
      {(restricted || openAppeal) ? (
        <Alert
          severity={restricted ? "error" : "warning"}
          icon={<ReportProblemIcon />}
          sx={{ mt: 2 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {restricted ? t.more.restricted : t.more.dashboardPending}
          </Typography>
          {openAppeal ? (
            <Typography variant="caption">{t.more.dashboardHint}</Typography>
          ) : null}
        </Alert>
      ) : null}
      {appealItems.length > 0 ? (
        <Box sx={{ mt: 2 }}>
          <ListCard>
            {appealItems.map((item) => (
              <ListRow
                key={`${item.subjectKind}-${item.subjectId}`}
                icon={<GavelIcon />}
                label={item.label}
                hint={
                  item.appealStatus === "OPEN"
                    ? t.more.dashboardPending
                    : item.appealResolution ?? item.createdAt
                }
                onClick={() => setAppealFor(item.canAppeal ? item : null)}
              />
            ))}
          </ListCard>
        </Box>
      ) : null}
      {providers.length > 0 ? (
        <Box sx={{ mt: 2 }}>
          <ListCard>
            {providers.map((provider) => (
              <ListRow
                key={provider.id}
                icon={
                  provider.kind === "TOW"
                    ? <LocalShippingIcon />
                    : <BuildCircleIcon />
                }
                label={provider.name}
                hint={
                  provider.status !== "ACTIVE" || provider.suspended
                    ? `${provider.status}${provider.suspended ? " · SUSPENDED" : ""}`
                    : provider.accepting
                      ? t.provider.accepting
                        : t.admin.dutyOff
                }
                trailing={
                  <Switch
                    checked={provider.accepting === true}
                    disabled={
                      dutyBusy ||
                      provider.status !== "ACTIVE" ||
                      provider.suspended === true
                    }
                    onChange={() => void toggleDuty(provider)}
                    slotProps={{ input: { "aria-label": provider.name } }}
                  />
                }
              />
            ))}
          </ListCard>
        </Box>
      ) : null}
      <Box sx={{ mt: 2 }}>
        <Card>
          {hasProviderRole ? (
            <Box sx={{ px: 2, pt: 1.5, pb: 1, borderBottom: 1, borderColor: "divider" }}>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={dashboardMode}
                onChange={(_, value: "RIDER" | "PROVIDER" | null) => {
                  if (value !== null) setDashboardMode(value);
                }}
                fullWidth
              >
                <ToggleButton value="RIDER">{t.more.dashboardRider}</ToggleButton>
                <ToggleButton value="PROVIDER">{t.more.dashboardProvider}</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          ) : null}
          <ListRow
            icon={<InsightsIcon />}
            label={t.more.dashboard}
            hint={currentDashboard.summary}
            onClick={() => setDashboardOpen(true)}
          />
        </Card>
      </Box>
      {shopProviders.length > 0 ? (
        <Box sx={{ mt: 2 }}>
          <ListCard>
            <ListRow
              icon={<HandymanIcon />}
              label={t.provider.walkInJobs}
              hint={t.provider.walkInJobsHint}
              onClick={() => navigate("/provider/jobs")}
            />
            <ListRow
              icon={<EventAvailableIcon />}
              label={t.provider.shopBookings}
              hint={t.provider.shopBookingsHint}
              onClick={() => navigate("/provider/bookings")}
            />
          </ListCard>
        </Box>
      ) : null}
      <Box sx={{ mt: 2 }}>
        <ListCard>
          <ListRow
            icon={<StorefrontIcon />}
            label={t.more.providers}
            hint={t.more.providersHint}
            onClick={() => navigate("/providers")}
          />
          <ListRow
            icon={<TwoWheelerIcon />}
            label={t.tabs.vehicle}
            hint={
              activeVehicle
                ? `${vehicleTypeLabel(activeVehicle.type, t)} · ${activeVehicle.baseWidth} m`
                : t.more.noVehicle
            }
            onClick={() => navigate("/vehicle")}
          />
          <ListRow
            icon={<ReceiptLongIcon />}
            label={t.more.bills}
            hint={t.more.billsHint}
            onClick={() => navigate("/bills")}
          />
          <ListRow
            icon={<VerifiedUserIcon />}
            label={t.more.warrantyClaims}
            hint={t.more.warrantyClaimsHint}
            onClick={() => navigate("/warranty")}
          />
          <ListRow
            icon={<BookmarkIcon />}
            label={t.more.savedRoutes}
            onClick={() => navigate("/saved")}
          />
          <ListRow
            icon={<WorkspacesIcon />}
            label={t.more.roles}
            hint={t.more.rolesHint}
            onClick={() => navigate("/roles")}
          />
          {isAdmin ? (
            <ListRow
              icon={<AdminPanelSettingsIcon />}
              label={t.admin.title}
              onClick={() => navigate("/admin")}
            />
          ) : null}
        </ListCard>
      </Box>
      <Box sx={{ mt: 2 }}>
        <ListCard>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.75 }}>
            <Box sx={{ display: "flex", color: "primary.main" }}>
              {dark ? <LightModeIcon /> : <DarkModeIcon />}
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 500 }}>
                {t.more.appearance}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dark ? t.lightMode : t.darkMode}
              </Typography>
            </Box>
            <Switch
              checked={dark}
              onChange={toggleTheme}
              slotProps={{ input: { "aria-label": t.more.appearance } }}
            />
          </Box>
          <ListRow
            icon={<TranslateIcon />}
            label={t.more.language}
            onClick={toggle}
            trailing={<Chip size="small" variant="outlined" label={lang.toUpperCase()} />}
          />
          <ListRow
            icon={<NotificationsActiveIcon />}
            label={t.more.notifications}
            onClick={() => void openNotifications()}
          />
          <ListRow
            icon={<SupportAgentIcon />}
            label={t.support.title}
            onClick={() => navigate("/support")}
          />
          <ListRow
            icon={<BuildIcon />}
            label={t.assist.title}
            hint={t.assist.walkInScreenHint}
            onClick={() => navigate("/dispatch")}
          />
          <ListRow
            icon={<TuneIcon />}
            label={t.diagnostics.title}
            onClick={() => navigate("/diagnostics")}
          />
          <ListRow
            icon={<DownloadIcon />}
            label={t.more.downloadApp}
            hint={t.more.about}
            onClick={() => setAboutOpen(true)}
          />
        </ListCard>
      </Box>
      <Box sx={{ mt: 2 }}>
        <ListCard>
          <ListRow
            icon={<LogoutIcon />}
            label={t.more.signOut}
            danger
            onClick={() => void signOut()}
          />
        </ListCard>
      </Box>
      <DashboardDialog
        t={t}
        data={currentDashboard.data}
        open={dashboardOpen}
        onClose={() => setDashboardOpen(false)}
      />
      <Dialog open={appealFor !== null} onClose={() => setAppealFor(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t.more.appealSubject}: {appealFor?.label}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {editError ? <Alert severity="error">{editError}</Alert> : null}
          <TextField
            select
            label={t.more.appealReason}
            value={appealReason}
            onChange={(event) => setAppealReason(event.target.value as AppealReason)}
          >
            {["RETALIATORY", "WRONG_TICKET", "NEW_EVIDENCE", "WRONG_OUTCOME", "AMOUNT_ERROR", "PROCEDURAL_ERROR", "OTHER"].map((reason) => (
              <MenuItem key={reason} value={reason}>{reason}</MenuItem>
            ))}
          </TextField>
          <TextField
            label={t.more.appealNote}
            value={appealNote}
            onChange={(event) => setAppealNote(event.target.value)}
            multiline
            minRows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAppealFor(null)}>{t.common.close}</Button>
          <Button
            variant="contained"
            disabled={appealBusy || appealNote.trim().length < 1}
            onClick={() => void submitAppeal()}
          >
            {t.more.appealSubmit}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t.more.editName}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {editError ? <Alert severity="error">{editError}</Alert> : null}
          <TextField
            label={t.more.name}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>{t.common.close}</Button>
          <Button
            variant="contained"
            disabled={nameBusy || !nameDraft.trim()}
            onClick={() => void onSaveName()}
          >
            {t.common.save}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={notifOpen} onClose={() => setNotifOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t.notifications.title}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {editError ? <Alert severity="error">{editError}</Alert> : null}
          {notifBusy && !prefs ? (
            <Typography color="text.secondary">{t.common.loading}</Typography>
          ) : null}
          {prefs ? (
            <>
              <FormControlLabel
                control={
                  <Switch
                    checked={prefs.paymentUpdates}
                    onChange={(e) => void savePrefs({ paymentUpdates: e.target.checked })}
                  />
                }
                label={t.notifications.paymentUpdates}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={prefs.payoutUpdates}
                    onChange={(e) => void savePrefs({ payoutUpdates: e.target.checked })}
                  />
                }
                label={t.notifications.payoutUpdates}
              />
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotifOpen(false)}>{t.common.close}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t.assistCta.title}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            {t.assistCta.body}
          </Typography>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            href={MOBILE_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.assistCta.download}
          </Button>
          <Button
            variant="outlined"
            href={MOBILE_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.assistCta.source}
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAboutOpen(false)}>{t.common.close}</Button>
        </DialogActions>
      </Dialog>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", textAlign: "center", mt: 2 }}
      >
        {t.appName}
      </Typography>
    </Screen>
  );
}
