import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { toMessage } from "../api/client";
import {
  acceptTicket,
  nearTickets,
  type DispatchTicket,
} from "../api/dispatch";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";

export default function VolunteerRadarScreen() {
  const { t } = useStrings();
  const { token } = useAuth();
  const [tickets, setTickets] = useState<DispatchTicket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onRefresh() {
    if (!token) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 8000,
          }),
      );
      setTickets(
        await nearTickets(
          {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            radiusMeters: 5000,
            ticketType: "SOS",
          },
          token,
        ),
      );
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function onAccept(ticketId: string) {
    if (!token) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await acceptTicket(ticketId, token);
      setNotice(t.dispatch.accepted);
      setTickets((prev) => prev.filter((x) => x.id !== ticketId));
    } catch (err) {
      setError(toMessage(err));
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2, overflowY: "auto", height: "100%" }}>
      <Typography variant="h6">{t.dispatch.radar}</Typography>
      <Typography variant="body2" color="text.secondary">
        {t.dispatch.radarHint}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mt: 1 }}>
          {notice}
        </Alert>
      )}
      <Button
        variant="contained"
        sx={{ mt: 2 }}
        onClick={() => void onRefresh()}
        disabled={loading}
      >
        {t.dispatch.radarLoad}
      </Button>
      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
        {tickets.map((ticket) => (
          <Card key={ticket.id}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Typography variant="subtitle2">
                  {ticket.ticketType}
                </Typography>
                <Chip
                  size="small"
                  label={
                    ticket.distance == null
                      ? ticket.id.slice(0, 6)
                      : `${Math.round(ticket.distance)} m`
                  }
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {ticket.lat.toFixed(5)}, {ticket.lng.toFixed(5)}
              </Typography>
              {ticket.note && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {ticket.note}
                </Typography>
              )}
              <Button
                size="small"
                variant="outlined"
                sx={{ mt: 1 }}
                onClick={() => void onAccept(ticket.id)}
              >
                {t.dispatch.accept}
              </Button>
            </CardContent>
          </Card>
        ))}
        {!loading && tickets.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            {t.dispatch.radarEmpty}
          </Typography>
        )}
      </Box>
    </Container>
  );
}
