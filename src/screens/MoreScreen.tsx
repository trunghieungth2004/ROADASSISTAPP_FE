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
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import LogoutIcon from "@mui/icons-material/Logout";
import TranslateIcon from "@mui/icons-material/Translate";
import { useColorScheme } from "@mui/material/styles";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";

export default function MoreScreen() {
  const { t, lang, toggle } = useStrings();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { mode, setMode } = useColorScheme();
  const dark = mode === "dark";

  return (
    <Container maxWidth="sm" sx={{ py: 2, overflowY: "auto", height: "100%" }}>
      <Typography variant="h5" component="h1">
        {t.more.title}
      </Typography>
      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        <Card>
          <List disablePadding>
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