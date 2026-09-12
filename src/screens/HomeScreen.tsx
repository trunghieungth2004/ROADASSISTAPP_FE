import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import AddAlertIcon from "@mui/icons-material/AddAlert";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import RouteIcon from "@mui/icons-material/Route";
import SosIcon from "@mui/icons-material/Sos";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import { flagsNear, type Flag } from "../api/flags";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";
import { mapDefaults } from "../map/style";

export default function HomeScreen() {
  const { t } = useStrings();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [nearby, setNearby] = useState<Flag[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    flagsNear(mapDefaults.center[1], mapDefaults.center[0], 3000, token)
      .then((flags) => setNearby(flags.slice(0, 5)))
      .catch((err: unknown) =>
        setError(
          err && typeof err === "object" && "message" in err
            ? String(err.message)
            : "Request failed",
        ),
      );
  }, [token]);

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
      title: t.home.requestHelp,
      hint: t.home.requestHelpHint,
      icon: <SosIcon color="primary" fontSize="large" />,
      to: "/dispatch",
      state: undefined as { flagMode: boolean } | undefined,
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

  return (
    <Container maxWidth="sm" sx={{ py: 2, overflowY: "auto", height: "100%" }}>
      <Typography variant="h5" component="h1">
        {t.home.greeting}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {t.home.subtitle}
      </Typography>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {actions.map((a) => (
          <Grid key={a.title} size={{ xs: 6 }}>
            <Card>
              <CardActionArea
                onClick={() => navigate(a.to, { state: a.state })}
                sx={{ p: 1 }}
              >
                <CardContent>
                  {a.icon}
                  <Typography variant="subtitle1" sx={{ mt: 1 }}>
                    {a.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {a.hint}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="subtitle1">{t.home.nearbyHazards}</Typography>
            <Button size="small" onClick={() => navigate("/hazards")}>
              {t.home.viewAll}
            </Button>
          </Box>
          {error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {error}
            </Alert>
          )}
          {!error && nearby.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t.home.noneNearby}
            </Typography>
          )}
          <List dense disablePadding>
            {nearby.map((f) => (
              <ListItem key={f.id} disableGutters>
                <ListItemText
                  primary={f.type}
                  secondary={`${f.voteCount ?? 0} ${t.flag.votes} · ${f.status}`}
                />
                <Chip label={f.status} size="small" color="warning" />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Container>
  );
}
