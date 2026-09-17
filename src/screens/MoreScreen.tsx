import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import HomeIcon from "@mui/icons-material/Home";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";
import TranslateIcon from "@mui/icons-material/Translate";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import { useColorScheme } from "@mui/material/styles";
import { toMessage } from "../api/client";
import { updateProfile } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { useStrings } from "../context/LanguageContext";
import { vehicleTypeLabel } from "../i18n/labels";
import { brandTileUrl } from "../map/style";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function MoreScreen() {
  const { t, lang, toggle } = useStrings();
  const { signOut, token } = useAuth();
  const navigate = useNavigate();
  const { mode, setMode } = useColorScheme();
  const dark = mode === "dark";
  const { user, activeVehicle, refresh } = useProfile();
  const [editOpen, setEditOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const displayName = user?.displayName || user?.email || "—";
  const services = user?.services ?? [];
  const isAdmin = user?.role === "1";

  function openEdit() {
    setNameDraft(user?.displayName ?? "");
    setEditError(null);
    setEditOpen(true);
  }

  async function onSaveName() {
    if (!token || !nameDraft.trim()) {
      return;
    }
    setEditError(null);
    try {
      await updateProfile({ displayName: nameDraft.trim() }, token);
      await refresh();
      setEditOpen(false);
    } catch (err) {
      setEditError(toMessage(err));
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2, overflowY: "auto", height: "100%" }}>
      <Card sx={{ position: "relative", overflow: "hidden" }}>
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: "-10%",
            backgroundImage: `url("${brandTileUrl()}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(14px)",
            transform: "scale(1.2)",
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(160deg, rgba(2,132,199,0.62), rgba(2,132,199,0.05) 75%)",
          }}
        />
        <Box
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 2,
            p: 2,
          }}
        >
          <Avatar sx={{ width: 56, height: 56 }}>
            {initials(displayName)}
          </Avatar>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography
              variant="h6"
              component="h1"
              sx={{ color: dark ? "#000000" : "#ffffff" }}
            >
              {displayName}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: dark ? "#000000" : "rgba(255,255,255,0.92)",
              }}
            >
              {user?.email ?? ""}
            </Typography>
            <Box sx={{ mt: 0.5, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
              <Chip
                size="small"
                label={isAdmin ? t.more.roleAdmin : t.more.roleUser}
              />
              {services.map((s) => (
                <Chip key={s} size="small" label={s} variant="outlined" />
              ))}
            </Box>
          </Box>
          <Button
            size="small"
            variant="contained"
            sx={{ flexShrink: 0 }}
            onClick={openEdit}
          >
            {t.more.editName}
          </Button>
        </Box>
        <Box sx={{ position: "relative", px: 2, pb: 2 }}>
          <Typography
            variant="body2"
            sx={{ color: dark ? "#000000" : "rgba(255,255,255,0.92)" }}
          >
            {t.more.activeVehicle}:{" "}
            {activeVehicle
              ? `${vehicleTypeLabel(activeVehicle.type, t)} · ${activeVehicle.baseWidth} m`
              : t.more.noVehicle}
          </Typography>
        </Box>
      </Card>
      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <DialogTitle>{t.more.editName}</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
        >
          {editError && <Alert severity="error">{editError}</Alert>}
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
            disabled={!nameDraft.trim()}
            onClick={() => void onSaveName()}
          >
            {t.common.save}
          </Button>
        </DialogActions>
      </Dialog>
      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        <Card>
          <List disablePadding>
            <ListItemButton onClick={() => navigate("/")}>
              <ListItemIcon>
                <HomeIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary={t.tabs.home} />
            </ListItemButton>
            <Divider component="li" />
            <ListItemButton onClick={() => navigate("/saved")}>
              <ListItemIcon>
                <BookmarkIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary={t.more.savedRoutes} />
            </ListItemButton>
            <Divider component="li" />
            <ListItemButton onClick={() => navigate("/roles")}>
              <ListItemIcon>
                <WorkspacesIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={t.more.roles}
                secondary={t.more.rolesHint}
              />
            </ListItemButton>
            {isAdmin && (
              <>
                <Divider component="li" />
                <ListItemButton onClick={() => navigate("/admin")}>
                  <ListItemIcon>
                    <AdminPanelSettingsIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={t.admin.title} />
                </ListItemButton>
              </>
            )}
          </List>
        </Card>
        <Card>
          <List disablePadding>
            <ListItemButton onClick={() => setMode(dark ? "light" : "dark")}>
              <ListItemIcon>
                {dark ? <LightModeIcon /> : <DarkModeIcon />}
              </ListItemIcon>
              <ListItemText
                primary={t.more.appearance}
                secondary={t.more.darkMode}
              />
            </ListItemButton>
            <Divider component="li" />
            <ListItemButton onClick={toggle}>
              <ListItemIcon>
                <TranslateIcon />
              </ListItemIcon>
              <ListItemText
                primary={t.more.language}
                secondary={lang === "en" ? "EN" : "VI"}
              />
            </ListItemButton>
          </List>
        </Card>
        <Card>
          <List disablePadding>
            <ListItemButton onClick={() => void signOut()}>
              <ListItemIcon>
                <LogoutIcon color="error" />
              </ListItemIcon>
              <ListItemText
                primary={t.more.signOut}
                slotProps={{
                  primary: { color: "error" },
                }}
              />
            </ListItemButton>
          </List>
        </Card>
      </Box>
    </Container>
  );
}
