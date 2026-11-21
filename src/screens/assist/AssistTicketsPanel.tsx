import { formatDateTimeDMY } from "../../utils/date";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import {
  approveInvoice,
  approveMobileFix,
  approveQuote,
  cancelTicket,
  declineMobileFix,
  declineQuote,
  myTickets,
  updateTicketStatus,
  type RiderTicket,
} from "../../api/dispatch";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import ChatDialog from "../../components/ChatDialog";
import type { Strings } from "../../i18n";
import {
  canApproveRiderQuote,
  isTerminalStatus,
  riderActions,
  riderStatusColor,
  riderStatusLabel,
  ticketTypeLabel,
} from "./riderActions";

function whenLabel(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : formatDateTimeDMY(date);
}

export default function AssistTicketsPanel({
  t,
  token,
  refreshKey,
}: {
  t: Strings;
  token: string;
  refreshKey: number;
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RiderTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelFor, setCancelFor] = useState<RiderTicket | null>(null);
  const [declineFor, setDeclineFor] = useState<RiderTicket | null>(null);
  const [chatFor, setChatFor] = useState<RiderTicket | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await myTickets(token));
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void load();
    }, 20000);
    return () => clearInterval(timer);
  }, [load]);

  const groups = useMemo(() => ({
    active: rows.filter((row) =>
      row.ticketType === "WALK_IN" && !isTerminalStatus(row.status)),
    history: rows.filter((row) =>
      row.ticketType === "WALK_IN" && isTerminalStatus(row.status)),
  }), [rows]);

  async function cancel(): Promise<void> {
    const ticket = cancelFor;
    if (!ticket || busyId !== null) return;
    setBusyId(ticket.id);
    setError(null);
    try {
      await cancelTicket(ticket.id, token);
      setCancelFor(null);
      setNotice(t.assist.cancelled);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function approve(ticket: RiderTicket): Promise<void> {
    if (busyId !== null) return;
    setBusyId(ticket.id);
    setError(null);
    try {
      if (ticket.ticketType === "SOS") {
        await approveMobileFix(ticket.id, token);
      } else {
        await approveQuote(ticket.id, token);
      }
      setNotice(t.assist.quoteApproved);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function decline(): Promise<void> {
    const ticket = declineFor;
    if (!ticket || busyId !== null) return;
    setBusyId(ticket.id);
    setError(null);
    try {
      if (ticket.ticketType === "SOS") {
        await declineMobileFix(ticket.id, token);
      } else {
        await declineQuote(ticket.id, token);
      }
      setDeclineFor(null);
      setNotice(t.assist.quoteDeclined);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function resolve(ticket: RiderTicket): Promise<void> {
    if (busyId !== null) return;
    setBusyId(ticket.id);
    setError(null);
    try {
      await updateTicketStatus(ticket.id, "4", token);
      setNotice(t.assist.resolved);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function approveFinalInvoice(ticket: RiderTicket): Promise<void> {
    if (busyId !== null) return;
    setBusyId(ticket.id);
    setError(null);
    try {
      await approveInvoice(ticket.id, token);
      setNotice(t.assist.quoteApproved);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  function card(ticket: RiderTicket) {
    const actions = riderActions(ticket.ticketType, ticket.status);
    const shop = ticket.providerSnapshot?.name ??
      ticket.destinationSnapshot?.name ??
      ticket.destinationSnapshot?.label ??
      ticket.assignedShopId ??
      ticket.providerId;
    return (
      <Card key={ticket.id} variant="outlined">
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>
              {`${ticketTypeLabel(ticket.ticketType, t)} · #${ticket.id.slice(-6)}`}
            </Typography>
            <Chip
              size="small"
              color={riderStatusColor(ticket.status)}
              label={riderStatusLabel(ticket.status, t)}
            />
          </Box>
          {shop ? <Typography variant="body2">{shop}</Typography> : null}
          {ticket.vehicleLabel || ticket.vehiclePlate ? (
            <Typography variant="body2" color="text.secondary">
              {[ticket.vehicleLabel, ticket.vehiclePlate].filter(Boolean).join(" · ")}
            </Typography>
          ) : null}
          {ticket.symptom ? <Typography variant="body2">{ticket.symptom}</Typography> : null}
          {ticket.description ? (
            <Typography variant="body2" color="text.secondary">{ticket.description}</Typography>
          ) : null}
          {ticket.shopQuotedAmount !== null && ticket.shopQuotedAmount !== undefined ? (
            <Typography variant="body2">
              {`${t.assist.quote}: ${ticket.shopQuotedAmount.toLocaleString()} VND`}
            </Typography>
          ) : null}
          <Typography variant="caption" color="text.secondary">{whenLabel(ticket.createdAt)}</Typography>
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", flexWrap: "wrap", mt: 1 }}>
            <Button onClick={() => setChatFor(ticket)}>{t.chat.title}</Button>
            {isTerminalStatus(ticket.status) || ticket.status === "7" ? (
              <Button onClick={() => navigate(`/bills/${ticket.id}`)}>{t.bookings.openBill}</Button>
            ) : null}
            {actions.includes("decline") ? (
              <Button color="error" onClick={() => setDeclineFor(ticket)} disabled={busyId !== null}>
                {t.assist.declineQuote}
              </Button>
            ) : null}
            {actions.includes("approve") ? (
              <Button variant="contained" onClick={() => void approve(ticket)} disabled={busyId !== null}>
                {t.assist.approveQuote}
              </Button>
            ) : null}
            {actions.includes("resolve") ? (
              <Button variant="contained" color="success" onClick={() => void resolve(ticket)} disabled={busyId !== null}>
                {t.assist.resolve}
              </Button>
            ) : null}
            {actions.includes("approveInvoice") ? (
              <Button variant="contained" color="success" onClick={() => void approveFinalInvoice(ticket)} disabled={busyId !== null}>
                {t.assist.approveQuote}
              </Button>
            ) : null}
            {actions.includes("cancel") ? (
              <Button color="error" onClick={() => setCancelFor(ticket)} disabled={busyId !== null}>
                {t.assist.cancel}
              </Button>
            ) : null}
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
      {error ? <Alert severity="error" onClose={() => setError(null)}>{error}</Alert> : null}
      {notice ? <Alert severity="success" onClose={() => setNotice(null)}>{notice}</Alert> : null}
      {loading && rows.length === 0 ? <LinearProgress /> : null}
      {!loading && rows.length === 0 ? <Alert severity="info">{t.assist.noTickets}</Alert> : null}
      {groups.active.length > 0 ? (
        <>
          <Typography variant="overline" color="text.secondary">{t.assist.active}</Typography>
          {groups.active.map(card)}
        </>
      ) : null}
      {groups.history.length > 0 ? (
        <>
          <Typography variant="overline" color="text.secondary" sx={{ mt: 1 }}>{t.assist.history}</Typography>
          {groups.history.map(card)}
        </>
      ) : null}
      {chatFor ? (
        <ChatDialog
          scope="TICKET"
          refId={chatFor.id}
          title={`${ticketTypeLabel(chatFor.ticketType, t)} · #${chatFor.id.slice(-6)}`}
          onClose={() => setChatFor(null)}
        />
      ) : null}
      <ConfirmDialog
        open={cancelFor !== null}
        title={t.assist.cancelPrompt}
        message={cancelFor ? `${ticketTypeLabel(cancelFor.ticketType, t)} · #${cancelFor.id.slice(-6)}` : ""}
        confirmLabel={t.assist.cancel}
        cancelLabel={t.common.cancel}
        danger
        busy={busyId !== null}
        error={error}
        onClose={() => setCancelFor(null)}
        onConfirm={() => void cancel()}
      />
      <ConfirmDialog
        open={declineFor !== null}
        title={t.assist.declinePrompt}
        message={canApproveRiderQuote(declineFor?.ticketType ?? "", declineFor?.status ?? "") ?
          `${ticketTypeLabel(declineFor?.ticketType ?? "", t)} · #${declineFor?.id.slice(-6)}` :
          ""}
        confirmLabel={t.assist.declineQuote}
        cancelLabel={t.common.cancel}
        danger
        busy={busyId !== null}
        error={error}
        onClose={() => setDeclineFor(null)}
        onConfirm={() => void decline()}
      />
    </Box>
  );
}
