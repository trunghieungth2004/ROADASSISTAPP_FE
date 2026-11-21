import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import DownloadIcon from "@mui/icons-material/Download";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Screen from "../components/ui/Screen";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { useStrings } from "../context/LanguageContext";
import { MOBILE_RELEASES_URL } from "../config/mobileLinks";
import { mapDefaults } from "../map/style";
import AssistRequestForm from "./assist/AssistRequestForm";
import AssistTicketsPanel from "./assist/AssistTicketsPanel";

export default function AssistScreen() {
  const { t } = useStrings();
  const { token } = useAuth();
  const { activeVehicle } = useProfile();
  const [tab, setTab] = useState<"request" | "mine">("request");
  const [point, setPoint] = useState<{ lat: number; lng: number }>({
    lat: mapDefaults.center[1],
    lng: mapDefaults.center[0],
  });
  const [locationError, setLocationError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function locate(): void {
    if (!navigator.geolocation) {
      setLocationError(t.assist.noLocation);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPoint({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationError(null);
      },
      () => setLocationError(t.assist.noLocation),
      { timeout: 10000 },
    );
  }

  useEffect(() => {
    locate();
  }, []);

  if (!token) return null;

  return (
    <Screen maxWidth="lg">
      <Typography variant="h5">{t.assist.walkInTitle}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {t.assist.walkInScreenHint}
      </Typography>
      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ flexGrow: 1, minWidth: 220 }}>
            <Typography sx={{ fontWeight: 700 }}>{t.assist.mobileOnlyTitle}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t.assist.mobileOnlyBody}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            href={MOBILE_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.assist.mobileOnlyCta}
          </Button>
        </CardContent>
      </Card>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2, flexWrap: "wrap" }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={tab}
          onChange={(_, value: "request" | "mine" | null) => {
            if (value !== null) setTab(value);
          }}
        >
          <ToggleButton value="request">{t.assist.requestTab}</ToggleButton>
          <ToggleButton value="mine">{t.assist.myRequests}</ToggleButton>
        </ToggleButtonGroup>
        <Button startIcon={<MyLocationIcon />} onClick={locate} sx={{ ml: "auto" }}>
          {t.assist.useLocation}
        </Button>
      </Box>
      {locationError ? <Alert severity="warning" sx={{ mt: 2 }}>{locationError}</Alert> : null}
      {point && tab === "request" ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          {`${t.assist.location}: ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}
        </Typography>
      ) : null}

      {tab === "request" ? (
        <AssistRequestForm
          t={t}
          token={token}
          point={point}
          locationError={locationError}
          activeVehicle={activeVehicle}
          onCreated={() => {
            setRefreshKey((value) => value + 1);
            setTab("mine");
          }}
        />
      ) : (
        <AssistTicketsPanel t={t} token={token} refreshKey={refreshKey} />
      )}
    </Screen>
  );
}
