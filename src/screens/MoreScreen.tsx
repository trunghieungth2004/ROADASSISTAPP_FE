import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import HomeIcon from "@mui/icons-material/Home";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";
import TranslateIcon from "@mui/icons-material/Translate";
import VolunteerIcon from "@mui/icons-material/VolunteerActivism";
import { useColorScheme } from "@mui/material/styles";
import { toMessage } from "../api/client";
import {
  fetchMe,
  setVolunteer,
  volunteerHeartbeat,
  type VolunteerCapability,
} from "../api/users";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";
import { brandTileUrl } from "../map/style";

export default function MoreScreen() {
  const { t, lang, toggle } = useStrings();
  const { signOut, token } = useAuth();
  const navigate = useNavigate();
  const { mode, setMode } = useColorScheme();
  const dark = mode === "dark";
  const [volunteer, setVolunteerOn] = useState(false);
  const [capability, setCapability] =
    useState<VolunteerCapability>("SOLO_BIKE");
  const [volError, setVolError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchMe(token)
        .then((me) => {
          setVolunteerOn(me.volunteerAvailable === true);
          if (me.capability === "CAR" || me.capability === "SOLO_BIKE") {
            setCapability(me.capability);
          }
        })
        .catch(() => setVolunteerOn(false));
    }
  }, [token]);

  async function onVolunteer(next: boolean, cap?: VolunteerCapability) {
    if (!token) {
      return;
    }
    setVolError(null);
    try {
      const res = await setVolunteer(
        {available: next, capability: cap ?? capability},
        token,
      );
      setVolunteerOn(res.available);
      if (res.available) {
        const pos = await new Promise<GeolocationPosition>(
          (resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 8000,
            }),
        );
        await volunteerHeartbeat(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          token,
        );
      }
    } catch (err) {
      setVolError(toMessage(err));
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
          <svg
            viewBox="0 0 220 140"
            width="72"
            height="46"
            aria-hidden
            style={{ flexShrink: 0 }}
          >
            <path
              d="M12 126 C 56 122, 62 80, 96 80 S 168 44, 200 22"
              fill="none"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="1 14"
            />
            <circle
              cx="200"
              cy="22"
              r="12"
              fill="#fbbf24"
              stroke="#ffffff"
              strokeWidth="3"
            />
            <circle cx="200" cy="22" r="4.5" fill="#451a03" />
          </svg>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              component="h1"
              sx={{ color: dark ? "#000000" : "#ffffff" }}
            >
              {t.appName}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: dark ? "#000000" : "rgba(255,255,255,0.92)",
              }}
            >
              {t.home.subtitle}
            </Typography>
          </Box>
        </Box>
      </Card>
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
          </List>
        </Card>
        <Card>
          <List disablePadding>
            <ListItem
              secondaryAction={
                <Switch
                  checked={dark}
                  onChange={(_, on) => setMode(on ? "dark" : "light")}
                  edge="end"
                  slotProps={{ input: { "aria-label": t.more.darkMode } }}
                />
              }
            >
              <ListItemButton
                onClick={() => setMode(dark ? "light" : "dark")}
              >
                <ListItemIcon>
                  {dark ? <LightModeIcon /> : <DarkModeIcon />}
                </ListItemIcon>
                <ListItemText
                  primary={t.more.appearance}
                  secondary={t.more.darkMode}
                />
              </ListItemButton>
            </ListItem>
            <Divider component="li" />
            <ListItem
              secondaryAction={
                <Typography variant="body2" color="text.secondary">
                  {lang === "en" ? "EN" : "VI"}
                </Typography>
              }
            >
              <ListItemButton onClick={toggle}>
                <ListItemIcon>
                  <TranslateIcon />
                </ListItemIcon>
                <ListItemText primary={t.more.language} />
              </ListItemButton>
            </ListItem>
          </List>
        </Card>
        <Card>
          <List disablePadding>
            <ListItem
              secondaryAction={
                <Switch
                  checked={volunteer}
                  onChange={(_, on) => void onVolunteer(on)}
                  edge="end"
                  slotProps={{ input: { "aria-label": t.more.volunteer } }}
                />
              }
            >
              <ListItemButton onClick={() => void onVolunteer(!volunteer)}>
                <ListItemIcon>
                  <VolunteerIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={t.more.volunteer}
                  secondary={
                    volError ??
                    (volunteer ? t.more.volunteerOn : t.more.volunteerHint)
                  }
                />
              </ListItemButton>
            </ListItem>
            <Divider component="li" />
            <ListItem
              secondaryAction={
                <TextField
                  select
                  size="small"
                  value={capability}
                  onChange={(e) => {
                    const next = e.target.value as VolunteerCapability;
                    setCapability(next);
                    if (volunteer) {
                      void onVolunteer(true, next);
                    }
                  }}
                  sx={{ minWidth: 150 }}
                >
                  <MenuItem value="SOLO_BIKE">
                    {t.roles.bikeOnly}
                  </MenuItem>
                  <MenuItem value="CAR">{t.roles.carCapable}</MenuItem>
                </TextField>
              }
            >
              <ListItemText
                primary={t.roles.volunteer}
                secondary={t.roles.volunteerHint}
              />
            </ListItem>
            <Divider component="li" />
            <ListItemButton onClick={() => navigate("/volunteer")}>
              <ListItemIcon>
                <VolunteerIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary={t.dispatch.radar} />
            </ListItemButton>
            <Divider component="li" />
            <ListItemButton onClick={() => navigate("/roles")}>
              <ListItemIcon>
                <VolunteerIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={t.more.roles}
                secondary={t.more.rolesHint}
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