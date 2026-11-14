import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import Screen from "../components/ui/Screen";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { useStrings } from "../context/LanguageContext";
import AssistRequestForm from "./assist/AssistRequestForm";
import AssistTicketsPanel from "./assist/AssistTicketsPanel";

export default function AssistScreen() {
  const { t } = useStrings();
  const { token } = useAuth();
  const { activeVehicle } = useProfile();
  const [tab, setTab] = useState<"request" | "mine">("request");
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
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
      <Typography variant="h5">{t.assist.title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {t.assist.screenHint}
      </Typography>
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
