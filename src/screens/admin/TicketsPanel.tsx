import { formatDateTimeDMY } from "../../utils/date";
import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import { adminTickets, type AdminTicket } from "../../api/admin";
import { useStrings } from "../../context/LanguageContext";
import AdminListItem from "./AdminListItem";
import EmptyState from "./EmptyState";
import MasterDetail from "./MasterDetail";
import PanelHeader from "./PanelHeader";
import TicketTimeline from "./TicketTimeline";
import { ticketStatusLabel } from "./ticketStatus";
import { ago, money } from "./format";
import { useAdminBill } from "./AdminBillContext";
import { adminStatusLabel } from "./adminLabels";

const STATUSES = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15",
];

function statusColor(status: string): "success" | "warning" | "error" | "default" {
  if (status === "4") return "success";
  if (["5", "8", "12", "15"].includes(status)) return "error";
  if (["1"].includes(status)) return "default";
  return "warning";
}

export default function TicketsPanel({ token }: { token: string | null }) {
  const { t } = useStrings();
  const { openBill } = useAdminBill();
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [status, setStatus] = useState("ALL");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(key: string) {
    setError(null);
    try {
      setTickets(await adminTickets(key, status === "ALL" ? undefined : status));
    } catch (err) {
      setError(toMessage(err));
    }
  }

  useEffect(() => {
    if (token) void load(token);
  }, [token, status]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((ticket) =>
      ticket.id.toLowerCase().includes(q) ||
      (ticket.riderName ?? "").toLowerCase().includes(q) ||
      (ticket.riderEmail ?? "").toLowerCase().includes(q) ||
      (ticket.providerName ?? "").toLowerCase().includes(q));
  }, [tickets, query]);

  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;

  return (
    <Box>
      <PanelHeader
        title={t.admin.tickets}
        onRefresh={() => token && void load(token)}
        refreshLabel={t.admin.refresh}
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
        <TextField
          size="small"
          label={t.admin.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          sx={{ flexGrow: 1, minWidth: 220 }}
        />
        <TextField
          select
          size="small"
          label={t.admin.status}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="ALL">{t.admin.allStatuses}</MenuItem>
          {STATUSES.map((value) => (
            <MenuItem key={value} value={value}>
              {ticketStatusLabel(value, t)}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      {visible.length === 0 ? (
        <EmptyState message={t.admin.noTickets} />
      ) : (
        <MasterDetail
          empty={t.admin.selectPrompt}
          list={visible.map((ticket) => (
            <AdminListItem
              key={ticket.id}
              selected={ticket.id === selectedId}
              onClick={() => setSelectedId(ticket.id)}
              title={`${t.admin.ticketType}: ${ticket.ticketType} · ${ticket.id}`}
              subtitle={`${ticket.riderName ?? ticket.riderId}${ticket.providerName ? ` → ${ticket.providerName}` : ""} · ${ago(ticket.createdAt ?? "", t)}`}
              chip={ticketStatusLabel(ticket.status, t)}
              chipColor={statusColor(ticket.status)}
            />
          ))}
          detail={
            selected ? (
              <Card>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {`${selected.ticketType} · ${selected.id}`}
                    </Typography>
                    <Chip size="small" color={statusColor(selected.status)} label={ticketStatusLabel(selected.status, t)} />
                  </Box>
                  <Typography variant="body2">
                    {`${t.admin.ticketRider}: ${selected.riderName ?? selected.riderId}${selected.riderEmail ? ` · ${selected.riderEmail}` : ""}`}
                  </Typography>
                  <Typography variant="body2">
                    {`${t.admin.ticketProvider}: ${selected.providerName ?? selected.providerId ?? "—"}${selected.providerKind ? ` · ${selected.providerKind}` : ""}`}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography variant="body2">{`${t.admin.ticketPayment}: ${selected.paymentStatus ? adminStatusLabel(selected.paymentStatus, t) : "—"}`}</Typography>
                    {selected.amount !== null ? <Chip size="small" variant="outlined" label={money(selected.amount)} /> : null}
                  </Box>
                  {selected.symptom ? <Typography variant="body2">{selected.symptom}</Typography> : null}
                  {selected.description ? <Typography variant="body2" color="text.secondary">{selected.description}</Typography> : null}
                  <TicketTimeline history={selected.statusHistory} t={t} />
                  <Typography variant="caption" color="text.secondary">
                    {`${t.admin.createdAt}: ${selected.createdAt ? formatDateTimeDMY(selected.createdAt) : "—"}`}
                  </Typography>
                  <Button size="small" variant="outlined" sx={{ alignSelf: "flex-start" }} onClick={() => openBill(selected.id)}>
                    {t.admin.viewBill}
                  </Button>
                </CardContent>
              </Card>
            ) : null
          }
        />
      )}
    </Box>
  );
}
