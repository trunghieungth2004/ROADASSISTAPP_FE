import { formatDateTimeDMY } from "../utils/date";
import { useCallback, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import { toMessage } from "../api/client";
import {
  createSupportTicket,
  mySupportTickets,
  type SupportTicket,
} from "../api/support";
import Screen from "../components/ui/Screen";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";

const CATEGORIES = ["PAYMENT", "SAFETY", "APP", "PROVIDER", "OTHER"] as const;

function statusColor(status: string): "warning" | "info" | "default" {
  if (status === "OPEN") return "warning";
  if (status === "ANSWERED") return "info";
  return "default";
}

function statusLabel(status: string, t: ReturnType<typeof useStrings>["t"]): string {
  if (status === "OPEN") return t.support.statusOpen;
  if (status === "ANSWERED") return t.support.statusAnswered;
  return t.support.statusClosed;
}

export default function SupportScreen() {
  const { t } = useStrings();
  const { token } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("APP");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await mySupportTickets(token);
      setTickets(result.tickets);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    if (!token || busy) return;
    if (message.trim().length < 10) {
      setError(t.support.messageHint);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createSupportTicket({ category, message: message.trim() }, token);
      setOpen(false);
      setMessage("");
      setNotice(t.support.sent);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {t.support.title}
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          {t.support.newTicket}
        </Button>
      </Box>
      {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mt: 2 }}>{notice}</Alert> : null}
      {loading ? (
        <Typography sx={{ mt: 2 }} color="text.secondary">
          {t.common.loading}
        </Typography>
      ) : null}
      {!loading && tickets.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>{t.support.empty}</Alert>
      ) : null}
      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {tickets.map((ticket) => (
          <Card key={ticket.id}>
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                  {(t.support.categories as Record<string, string>)[ticket.category] ??
                    ticket.category}
                </Typography>
                <Chip
                  size="small"
                  color={statusColor(ticket.status)}
                  label={statusLabel(ticket.status, t)}
                />
              </Box>
              {ticket.ticketId ? (
                <Typography variant="caption" color="text.secondary">
                  {ticket.ticketId}
                </Typography>
              ) : null}
              <Typography variant="body2">{ticket.message}</Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDateTimeDMY(ticket.createdAt)}
              </Typography>
              {ticket.answer ? (
                <Alert severity="info">
                  <Typography variant="caption" sx={{ display: "block", fontWeight: 700 }}>
                    {t.support.reply}
                  </Typography>
                  {ticket.answer}
                </Alert>
              ) : ticket.status !== "CLOSED" ? (
                <Typography variant="caption" color="text.secondary">
                  {t.support.noReply}
                </Typography>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </Box>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t.support.newTicket}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            select
            label={t.support.category}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          >
            {CATEGORIES.map((value) => (
              <MenuItem key={value} value={value}>
                {(t.support.categories as Record<string, string>)[value]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t.support.message}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            helperText={t.support.messageHint}
            multiline
            minRows={3}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t.common.cancel}</Button>
          <Button variant="contained" disabled={busy} onClick={() => void submit()}>
            {t.support.submit}
          </Button>
        </DialogActions>
      </Dialog>
    </Screen>
  );
}
