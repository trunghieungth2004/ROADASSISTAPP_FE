import { useEffect, useState } from "react";
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
import Typography from "@mui/material/Typography";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import BuildIcon from "@mui/icons-material/Build";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import DownloadIcon from "@mui/icons-material/Download";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import StorefrontIcon from "@mui/icons-material/Storefront";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import TranslateIcon from "@mui/icons-material/Translate";
import TuneIcon from "@mui/icons-material/Tune";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
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

  const displayName = user?.displayName || user?.email || "—";
  const services = user?.services ?? [];
  const isAdmin = user?.role === "1";

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  return (
    <Screen>
      <ProfileHeader
        name={displayName}
        email={user?.email ?? ""}
        roleLabel={isAdmin ? t.more.roleAdmin : t.more.roleUser}
        services={services.map(serviceLabel)}
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
                `${t.more.restrictedUntil}: ${new Date(user.restrictedUntil).toLocaleDateString()}` :
                null,
              user?.restrictionReason ?? null,
            ].filter((part): part is string => Boolean(part)).join(" · ")}
          </Typography>
        </Alert>
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
            label={t.assistCta.title}
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
