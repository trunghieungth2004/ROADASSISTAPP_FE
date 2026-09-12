import { useEffect, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toMessage } from "../api/client";
import {
  advanceTicket,
  createTicket,
  fetchStatuses,
  getTicket,
  type DispatchTicket,
  type StatusEntry,
  type TicketType,
} from "../api/dispatch";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";
import { mapDefaults } from "../map/style";

const TICKET_TYPES: TicketType[] = ["MECHANIC", "TOW", "SOS"];
const LAST_TICKET_KEY = "roadassist.lastTicket";

export default function DispatchScreen() {
  const { t } = useStrings();
  const { token } = useAuth();
  const [ticketType, setTicketType] = useState<TicketType>("MECHANIC");
  const [lat, setLat] = useState(String(mapDefaults.center[1]));
  const [lng, setLng] = useState(String(mapDefaults.center[0]));
  const [lookupId, setLookupId] = useState(
    () => localStorage.getItem(LAST_TICKET_KEY) ?? "",
  );
  const [ticket, setTicket] = useState<DispatchTicket | null>(null);
  const [statuses, setStatuses] = useState<StatusEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchStatuses(token)
        .then((all) => setStatuses(all.dispatch ?? []))
        .catch(() => setStatuses([]));
    }
  }, [token]);

  function useLocation() {
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
      },
      (err) => setError(err.message),
      { timeout: 8000 },
    );
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const created = await createTicket(
        { ticketType, lat: Number(lat), lng: Number(lng) },
        token,
      );
      setTicket(created);
      setLookupId(created.id);
      localStorage.setItem(LAST_TICKET_KEY, created.id);
      setNotice(t.dispatch.created);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onLookup(e: FormEvent) {
    e.preventDefault();
    if (!token || !lookupId) {
      return;
    }
    setError(null);
    try {
      setTicket(await getTicket(lookupId, token));
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onAdvance(status: string) {
    if (!token || !ticket) {
      return;
    }
    setError(null);
    try {
      await advanceTicket(ticket.id, status, token);
      setTicket(await getTicket(ticket.id, token));
    } catch (err) {
      setError(toMessage(err));
    }
  }

  const statusName =
    statuses.find((s) => s.code === ticket?.status)?.name ?? ticket?.status;

  return (
    <Container maxWidth="sm" sx={{ py: 2, overflowY: "auto", height: "100%" }}>
      <Typography variant="h6">{t.dispatch.title}</Typography>
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
      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1">{t.dispatch.newTicket}</Typography>
            <Box
              component="form"
              onSubmit={onCreate}
              sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                select
                value={ticketType}
                onChange={(e) => setTicketType(e.target.value as TicketType)}
                fullWidth
              >
                {TICKET_TYPES.map((v) => (
                  <MenuItem key={v} value={v}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  type="number"
                  required
                  label="lat"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  fullWidth
                />
                <TextField
                  type="number"
                  required
                  label="lng"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  fullWidth
                />
              </Box>
              <Button variant="outlined" onClick={useLocation}>
                {t.dispatch.useLocation}
              </Button>
              <Button type="submit" variant="contained">
                {t.dispatch.create}
              </Button>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="subtitle1">{t.dispatch.lookup}</Typography>
            <Box
              component="form"
              onSubmit={onLookup}
              sx={{ mt: 1, display: "flex", gap: 1 }}
            >
              <TextField
                label={t.dispatch.ticketId}
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                fullWidth
              />
              <Button type="submit" variant="contained">
                {t.common.retry}
              </Button>
            </Box>
            {ticket ? (
              <Box
                sx={{ mt: 1, bgcolor: "action.hover", borderRadius: 2, p: 1.5 }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="subtitle2">
                    {ticket.ticketType}
                  </Typography>
                  <Chip
                    label={`${t.dispatch.statusNames}: ${statusName}`}
                    size="small"
                    color="success"
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {ticket.lat.toFixed(5)}, {ticket.lng.toFixed(5)}
                </Typography>
                {statuses.length > 0 && (
                  <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {statuses
                      .filter((s) => s.code !== ticket.status)
                      .map((s) => (
                        <Chip
                          key={s.code}
                          label={`${t.dispatch.advance}: ${s.name}`}
                          size="small"
                          onClick={() => void onAdvance(s.code)}
                        />
                      ))}
                  </Box>
                )}
              </Box>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                {t.dispatch.empty}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
