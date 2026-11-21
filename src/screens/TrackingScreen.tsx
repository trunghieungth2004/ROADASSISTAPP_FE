import { formatDateTimeDMY } from "../utils/date";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { statusName } from "../api/meta";
import { viewShare, type TrackingView } from "../api/tracking";
import TrackingMap from "../components/TrackingMap";
import { useStrings } from "../context/LanguageContext";

const POLL_MS = 15_000;

function ticketLabel(type: string): string {
  if (type === "TOW") return "TOW";
  if (type === "SOS") return "SOS";
  if (type === "MECHANIC") return "MECHANIC";
  return "WALK_IN";
}

export default function TrackingScreen() {
  const { t } = useStrings();
  const { token = "" } = useParams();
  const [data, setData] = useState<TrackingView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (token === "") return;
    try {
      setData(await viewShare(token));
      setError(null);
    } catch {
      setError(t.tracking.invalid);
    }
  }, [token, t.tracking.invalid]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <Container maxWidth="sm" sx={{ py: 3, display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h6">{t.tracking.title}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {data && (
        <Card>
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                {ticketLabel(data.ticketType)} · {data.ticketId}
              </Typography>
              <Chip size="small" label={statusName("dispatch", data.status, data.status)} color="primary" />
            </Box>
            {data.providerName && (
              <Typography variant="body2">
                {t.tracking.provider}: {data.providerName}
              </Typography>
            )}
            {data.etaPickupAt && (
              <Typography variant="body2">
                {t.tracking.eta}: {new Date(data.etaPickupAt).toLocaleTimeString()}
              </Typography>
            )}
            {data.updatedAt && (
              <Typography variant="caption" color="text.secondary">
                {t.tracking.updated}: {formatDateTimeDMY(data.updatedAt)}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              {t.tracking.expires}: {formatDateTimeDMY(data.expiresAt)}
            </Typography>
            <Box
              sx={{
                position: "relative",
                height: 280,
                borderRadius: 4,
                overflow: "hidden",
                border: 1,
                borderColor: "divider",
              }}
            >
              <TrackingMap lat={data.lat} lng={data.lng} />
            </Box>
            <Typography variant="caption" color="text.secondary">
              {`${t.tracking.liveLocation}: ${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}
