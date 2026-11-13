import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import {
  adminClearRestriction,
  adminResetStanding,
  adminUserStanding,
  type AdminStanding,
} from "../../api/admin";
import {
  fetchAllUsers,
  updateUserRole,
  updateUserServices,
  updateUserStatus,
  updateUserTrust,
  type AdminUser,
} from "../../api/users";
import { useStrings } from "../../context/LanguageContext";
import AdminListItem from "./AdminListItem";
import MasterDetail from "./MasterDetail";
import EmptyState from "./EmptyState";
import PanelHeader from "./PanelHeader";
import SettingField from "./SettingField";

function trustTone(score: number): { color: "success" | "warning" | "error"; label: (t: ReturnType<typeof useStrings>["t"]) => string } {
  if (score >= 70) return { color: "success", label: (t) => t.admin.trustHigh };
  if (score >= 40) return { color: "warning", label: (t) => t.admin.trustMedium };
  return { color: "error", label: (t) => t.admin.trustLow };
}

export default function UsersPanel({ token }: { token: string | null }) {
  const { t } = useStrings();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState("2");
  const [statusDraft, setStatusDraft] = useState("1");
  const [trust, setTrust] = useState("");
  const [note, setNote] = useState("");
  const [licenseConfirm, setLicenseConfirm] = useState(false);
  const [standingBusy, setStandingBusy] = useState(false);
  const [standing, setStanding] = useState<AdminStanding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(key: string) {
    setError(null);
    try {
      setUsers(await fetchAllUsers(key));
    } catch (err) {
      setError(toMessage(err));
    }
  }

  useEffect(() => {
    if (token) void load(token);
  }, [token]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "ALL" && user.role !== roleFilter) return false;
      if (statusFilter !== "ALL" && (user.status ?? "1") !== statusFilter) return false;
      if (!q) return true;
      return (
        (user.email ?? "").toLowerCase().includes(q) ||
        (user.displayName ?? "").toLowerCase().includes(q) ||
        user.id.toLowerCase().includes(q)
      );
    });
  }, [users, query, roleFilter, statusFilter]);

  const selected = users.find((user) => user.id === selectedId) ?? null;

  function select(user: AdminUser) {
    setSelectedId(user.id);
    setStanding(null);
    if (token) {
      void adminUserStanding(token, user.id)
        .then(setStanding)
        .catch(() => undefined);
    }
    setRoleDraft(user.role);
    setStatusDraft(user.status ?? "1");
    setTrust(String(user.trustScore ?? 0));
    setNote("");
    setNotice(null);
  }

  async function saveUser() {
    if (!token || !selected || busy) return;
    const roleChanged = roleDraft !== selected.role;
    const statusChanged = statusDraft !== (selected.status ?? "1");
    if (statusChanged && statusDraft === "0" && note.trim() === "") {
      setError(t.admin.noteRequired);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (roleChanged) {
        await updateUserRole(
          selected.id,
          roleDraft,
          token,
          note.trim() || undefined,
        );
      }
      if (statusChanged) {
        await updateUserStatus(
          selected.id,
          statusDraft,
          token,
          note.trim() || undefined,
        );
      }
      const score = Number(trust);
      if (Number.isFinite(score) && score !== (selected.trustScore ?? 0)) {
        await updateUserTrust(selected.id, score, token);
      }
      await load(token);
      setNotice(t.admin.saved);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleLicense() {
    if (!token || !selected) return;
    const hasLicense = selected.services?.includes("RIDER") === true;
    try {
      await updateUserServices(
        selected.id,
        hasLicense ? { revoke: ["RIDER"] } : { grant: ["RIDER"] },
        token,
      );
      setLicenseConfirm(false);
      await load(token);
      setNotice(t.admin.saved);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  function serviceLabel(service: string): string {
    if (service === "RIDER") return t.roles.rider;
    if (service === "SHOP") return t.roles.shop;
    if (service === "TOW") return t.roles.tow;
    if (service === "MOBILE_SHOP") return t.roles.mobileShop;
    return service;
  }

  function roleLabel(role: string): string {
    if (role === "1") return t.admin.admin;
    if (role === "2") return t.admin.user;
    return `legacy: ${role}`;
  }

  async function clearRestriction(): Promise<void> {
    if (!token || !selected || standingBusy) return;
    setStandingBusy(true);
    setError(null);
    try {
      await adminClearRestriction(token, {
        targetKind: "RIDER",
        targetId: selected.id,
      });
      await load(token);
      setStanding(await adminUserStanding(token, selected.id));
      setNotice(t.admin.restrictionCleared);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setStandingBusy(false);
    }
  }

  async function resetStanding(): Promise<void> {
    if (!token || !selected || standingBusy) return;
    setStandingBusy(true);
    setError(null);
    try {
      await adminResetStanding(token, selected.id);
      await load(token);
      setStanding(await adminUserStanding(token, selected.id));
      setNotice(t.admin.standingReset);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setStandingBusy(false);
    }
  }

  const tone = trustTone(selected?.trustScore ?? 0);

  return (
    <Box>
      <PanelHeader
        title={t.admin.users}
        onRefresh={() => token && void load(token)}
        refreshLabel={t.admin.refresh}
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert> : null}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
        <TextField
          size="small"
          label={t.admin.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 200 }}
        />
        <TextField
          select
          size="small"
          label={t.admin.filterRole}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="ALL">{t.admin.allRoles}</MenuItem>
          <MenuItem value="1">{t.admin.admin}</MenuItem>
          <MenuItem value="2">{t.admin.user}</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label={t.admin.filterStatus}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="ALL">{t.admin.allStatuses}</MenuItem>
          <MenuItem value="1">{t.admin.active}</MenuItem>
          <MenuItem value="0">{t.admin.blocked}</MenuItem>
        </TextField>
      </Box>
      <MasterDetail
        empty={t.admin.selectPrompt}
        list={visible.length === 0 ? <EmptyState message={t.admin.noUsers} /> : visible.map((user) => (
          <AdminListItem
            key={user.id}
            selected={user.id === selectedId}
            onClick={() => select(user)}
            title={user.displayName || user.email || user.id}
            subtitle={`${user.email ?? ""} · ${t.admin.trust}: ${user.trustScore ?? 0}`}
            chip={roleLabel(user.role)}
            chipColor={user.role === "1" ? "primary" : user.role === "2" ? "default" : "warning"}
          />
        ))}
        detail={
          selected ? (
            <Card>
              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Typography variant="h6">{selected.displayName || selected.email || selected.id}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selected.email ?? ""} · {selected.id}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${t.admin.rating}: ${selected.ratingAvg?.toFixed(1) ?? "—"} (${selected.ratingCount ?? 0})`}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${t.admin.joined}: ${selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : "—"}`}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={selected.onboarded ? "onboarded" : "not onboarded"}
                  />
                  {typeof selected.disputeCount === "number" && selected.disputeCount > 0 ? (
                    <Chip
                      size="small"
                      color={selected.disputeCount >= 3 ? "warning" : "default"}
                      label={`${t.admin.disputes}: ${selected.disputeCount}`}
                    />
                  ) : null}
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${t.admin.standing}: ${selected.standingScore ?? 100}`}
                  />
                  {selected.bookingBlocked || selected.restrictedUntil ? (
                    <Chip
                      size="small"
                      color="error"
                      label={`${t.admin.restrictedUntil}: ${selected.restrictedUntil ? new Date(selected.restrictedUntil).toLocaleDateString() : "—"}`}
                    />
                  ) : null}
                  {selected.conductFlag ? (
                    <Chip size="small" color="warning" label={t.admin.conductFlag} />
                  ) : null}
                </Box>
                {selected.services &&
                selected.services.filter((service) => service !== "VOLUNTEER").length > 0 ? (
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                    {selected.services
                      .filter((service) => service !== "VOLUNTEER")
                      .map((service) => (
                        <Chip key={service} size="small" label={serviceLabel(service)} />
                      ))}
                  </Box>
                ) : null}
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
                      {`${t.admin.trust}: ${selected.trustScore ?? 0}`}
                    </Typography>
                    <Typography variant="caption" color={`${tone.color}.main`}>
                      {tone.label(t)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, Math.max(0, selected.trustScore ?? 0))}
                    color={tone.color}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
                      {`${t.admin.standingScore}: ${selected.standingScore ?? 100}`}
                    </Typography>
                    {selected.conductFlag ? (
                      <Typography variant="caption" color="error.main">{t.admin.conductFlag}</Typography>
                    ) : null}
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, Math.max(0, selected.standingScore ?? 100))}
                    color={(selected.standingScore ?? 100) < 50 ? "error" : (selected.standingScore ?? 100) < 60 ? "warning" : "success"}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  {standing && standing.events.length > 0 ? (
                    <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">{t.admin.standingEvents}</Typography>
                      {standing.events.slice(0, 4).map((event, index) => (
                        <Typography key={`${String(event.createdAt)}-${index}`} variant="caption" color="text.secondary">
                          {`${String(event.action ?? "")} · ${String(event.reason ?? "")}${event.createdAt ? ` · ${new Date(String(event.createdAt)).toLocaleDateString()}` : ""}`}
                        </Typography>
                      ))}
                    </Box>
                  ) : null}
                </Box>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2">{t.admin.riderLicense}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t.admin.riderLicenseDesc}
                    </Typography>
                  </Box>
                  <Switch
                    checked={selected.services?.includes("RIDER") === true}
                    onChange={() => setLicenseConfirm(true)}
                    slotProps={{ input: { "aria-label": t.admin.licenseToggle } }}
                  />
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 1.5 }}>
                  <SettingField label={t.admin.role}>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      value={roleDraft}
                      onChange={(e) => setRoleDraft(e.target.value)}
                    >
                      <MenuItem value="1">{t.admin.admin}</MenuItem>
                      <MenuItem value="2">{t.admin.user}</MenuItem>
                      {roleDraft !== "1" && roleDraft !== "2" ? (
                        <MenuItem value={roleDraft}>{`legacy: ${roleDraft}`}</MenuItem>
                      ) : null}
                    </TextField>
                  </SettingField>
                  <SettingField label={t.admin.status}>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value)}
                    >
                      <MenuItem value="1">{t.admin.active}</MenuItem>
                      <MenuItem value="0">{t.admin.blocked}</MenuItem>
                    </TextField>
                  </SettingField>
                  <SettingField label={t.admin.trust}>
                    <TextField
                      size="small"
                      type="number"
                      fullWidth
                      value={trust}
                      onChange={(e) => setTrust(e.target.value)}
                    />
                  </SettingField>
                </Box>
                <TextField
                  size="small"
                  label={t.admin.changeReason}
                  helperText={statusDraft === "0" ? t.admin.blockReason : undefined}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  fullWidth
                />
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button
                    variant="contained"
                    disabled={busy}
                    onClick={() => void saveUser()}
                  >
                    {t.admin.save}
                  </Button>
                  {selected.bookingBlocked || selected.restrictedUntil ? (
                    <Button
                      variant="outlined"
                      disabled={standingBusy}
                      onClick={() => void clearRestriction()}
                    >
                      {t.admin.clearRestriction}
                    </Button>
                  ) : null}
                  <Button
                    variant="text"
                    disabled={standingBusy}
                    onClick={() => void resetStanding()}
                  >
                    {t.admin.resetStanding}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ) : null
        }
      />
      <Dialog open={licenseConfirm} onClose={() => setLicenseConfirm(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t.admin.confirmTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{t.admin.confirmLicense}</Typography>
          {selected ? (
            <Typography variant="caption" color="text.secondary">
              {selected.displayName || selected.email || selected.id}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLicenseConfirm(false)}>{t.common.cancel}</Button>
          <Button variant="contained" onClick={() => void toggleLicense()}>
            {t.common.save}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
