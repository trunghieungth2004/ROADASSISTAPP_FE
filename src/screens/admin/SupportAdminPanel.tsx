import { formatDateTimeDMY } from "../../utils/date";
import { useEffect, useState } from "react";
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
import { fetchAllUsers, type AdminUser } from "../../api/users";
import {
  adminSupport,
  adminSupportRespond,
  type SupportTicket,
} from "../../api/support";
import { useStrings } from "../../context/LanguageContext";
import AdminListItem from "./AdminListItem";
import { useAdminBill } from "./AdminBillContext";
import { adminStatusLabel, adminStatusTone } from "./adminLabels";
import MasterDetail from "./MasterDetail";
import EmptyState from "./EmptyState";
import PanelHeader from "./PanelHeader";
import { useAdminQueue } from "./AdminQueueContext";
import { ago } from "./format";

export default function SupportAdminPanel({ token }: { token: string | null }) {
  const { t } = useStrings();
  const { openBill } = useAdminBill();
  const { refresh } = useAdminQueue();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [status, setStatus] = useState("OPEN");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(key: string, nextStatus: string) {
    setError(null);
    try {
      const result = await adminSupport(key, nextStatus);
      setTickets(result.tickets);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  useEffect(() => {
    if (token) void load(token, status);
  }, [token, status]);

  useEffect(() => {
    if (!token) return;
    void fetchAllUsers(token).then(setUsers).catch(() => undefined);
  }, [token]);

  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;

  function select(ticket: SupportTicket) {
    setSelectedId(ticket.id);
    setNotice(null);
  }

  async function reply(close: boolean) {
    if (!token || !selected || busy) return;
    const answer = (drafts[selected.id] ?? "").trim();
    if (answer === "") return;
    setBusy(true);
    setError(null);
    try {
      await adminSupportRespond(token, selected.id, answer, close);
      setNotice(t.admin.replied);
      await load(token, status);
      refresh();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box>
      <PanelHeader
        title={t.admin.support}
        onRefresh={() => token && void load(token, status)}
        refreshLabel={t.admin.refresh}
        action={
          <TextField
            select
            size="small"
            label={t.admin.supportStatus}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            {["OPEN", "ANSWERED", "CLOSED"].map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </TextField>
        }
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert> : null}
      {tickets.length === 0 ? (
        <EmptyState message={t.admin.noSupport} />
      ) : (
        <MasterDetail
          empty={t.admin.selectPrompt}
          list={tickets.map((ticket) => (
            <AdminListItem
              key={ticket.id}
              selected={ticket.id === selectedId}
              onClick={() => select(ticket)}
              title={`${ticket.category} · ${users.find((user) => user.id === ticket.userId)?.displayName ?? ticket.userId}`}
              subtitle={ago(ticket.createdAt, t)}
              chip={adminStatusLabel(ticket.status, t)}
              chipColor={adminStatusTone(ticket.status)}
            />
          ))}
          detail={
            selected ? (
              <Card>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {selected.category}
                    </Typography>
                    <Chip size="small" label={adminStatusLabel(selected.status, t)} color={adminStatusTone(selected.status)} />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {`${users.find((user) => user.id === selected.userId)?.displayName ?? selected.userId} · ${formatDateTimeDMY(selected.createdAt)}`}
                  </Typography>
                  {users.find((user) => user.id === selected.userId)?.email ? (
                    <Typography variant="caption" color="text.secondary">
                      {users.find((user) => user.id === selected.userId)?.email}
                    </Typography>
                  ) : null}
                  {selected.ticketId ? (
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ alignSelf: "flex-start" }}
                      onClick={() => openBill(selected.ticketId as string)}
                    >
                      {`${t.admin.viewBill} · ${selected.ticketId}`}
                    </Button>
                  ) : null}
                  <Typography variant="body2">{selected.message}</Typography>
                  {selected.answer ? <Alert severity="info">{selected.answer}</Alert> : null}
                  {selected.status !== "CLOSED" ? (
                    <>
                      <TextField
                        size="small"
                        multiline
                        minRows={2}
                        label={t.admin.supportReply}
                        value={drafts[selected.id] ?? ""}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [selected.id]: e.target.value }))
                        }
                      />
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={busy}
                          onClick={() => void reply(false)}
                        >
                          {t.admin.send}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={busy}
                          onClick={() => void reply(true)}
                        >
                          {t.common.close}
                        </Button>
                      </Box>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            ) : null
          }
        />
      )}
    </Box>
  );
}
