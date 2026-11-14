import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import AddAlertIcon from "@mui/icons-material/AddAlert";
import BuildIcon from "@mui/icons-material/Build";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import RouteIcon from "@mui/icons-material/Route";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import { flagsNear, type Flag } from "../api/flags";
import { flagStatusColor, flagStatusLabel } from "../components/flagStatus";
import Screen from "../components/ui/Screen";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { useStrings } from "../context/LanguageContext";
import { flagTypeLabel } from "../i18n/labels";
import { mapDefaults } from "../map/style";
import { toMessage } from "../api/client";

export default function HomeScreen() {
  const { t } = useStrings();
  const { token } = useAuth();
  const { user } = useProfile();
  const navigate = useNavigate();
  const [nearby, setNearby] = useState<Flag[]>([]);
  const [point, setPoint] = useState({
    lat: mapDefaults.center[1],
    lng: mapDefaults.center[0],
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => undefined,
      { timeout: 5000 },
    );
  }, []);

  useEffect(() => {
    if (!token) return;
    flagsNear(point.lat, point.lng, 3000, token)
      .then((flags) => setNearby(flags.slice(0, 5)))
      .catch((err: unknown) => setError(toMessage(err)));
  }, [token, point]);

  const actions = [
    {
      title: t.home.findRoute,
      hint: t.home.findRouteHint,
      icon: <RouteIcon color="primary" fontSize="large" />,
      to: "/route",
      state: undefined as { flagMode: boolean } | undefined,
    },
    {
      title: t.home.reportHazard,
      hint: t.home.reportHazardHint,
      icon: <AddAlertIcon color="primary" fontSize="large" />,
      to: "/route",
      state: { flagMode: true },
    },
    {
      title: t.home.vehicle,
      hint: t.home.vehicleHint,
      icon: <TwoWheelerIcon color="primary" fontSize="large" />,
      to: "/vehicle",
      state: undefined as { flagMode: boolean } | undefined,
    },
    {
      title: t.home.savedRoutes,
      hint: t.home.savedRoutesHint,
      icon: <BookmarkIcon color="primary" fontSize="large" />,
      to: "/saved",
      state: undefined as { flagMode: boolean } | undefined,
    },
  ];

  const displayName = user?.displayName || user?.email || "";

  return (
    <Screen maxWidth="md">
      <Card>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography variant="h6" component="h1">
            {t.home.greeting}
            {displayName ? `, ${displayName}` : ""}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t.home.subtitle}
          </Typography>
        </CardContent>
      </Card>
      <Box
        sx={{
          mt: 2,
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
          gap: 1.5,
        }}
      >
        {actions.map((action) => (
          <Card key={action.title} sx={{ height: "100%" }}>
            <CardActionArea
              onClick={() => navigate(action.to, { state: action.state })}
              sx={{ height: "100%" }}
            >
              <CardContent>
                {action.icon}
                <Typography variant="subtitle1" sx={{ mt: 1 }}>
                  {action.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {action.hint}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
      <Card sx={{ mt: 2 }}>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <BuildIcon color="primary" />
            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
              {t.assist.title}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {t.assist.homeHint}
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate("/dispatch")}
            sx={{ alignSelf: "flex-start" }}
          >
            {t.assist.requestHelp}
          </Button>
        </CardContent>
      </Card>
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              mb: 1,
            }}
          >
            <Typography variant="subtitle1">{t.home.nearbyHazards}</Typography>
            <Button size="small" onClick={() => navigate("/hazards")}>
              {t.home.viewAll}
            </Button>
          </Box>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {!error && nearby.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t.home.noneNearby}
            </Typography>
          ) : null}
          {nearby.map((flag) => (
            <Box
              key={flag.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                py: 1,
                borderTop: 1,
                borderColor: "divider",
                "&:first-of-type": { borderTop: 0 },
              }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {flagTypeLabel(flag.type, t)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {flag.voteCount ?? 0} {t.flag.votes}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={flagStatusLabel(flag.status, t)}
                sx={{ bgcolor: flagStatusColor(flag.status), color: "#fff" }}
              />
              <ChevronRightIcon sx={{ color: "text.secondary" }} />
            </Box>
          ))}
        </CardContent>
      </Card>
    </Screen>
  );
}
