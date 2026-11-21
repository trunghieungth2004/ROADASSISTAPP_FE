import { formatDateTimeDMY } from "../../utils/date";
import { useEffect, useMemo, useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { toMessage } from "../../api/client";
import { adminPayments, type AdminPayment } from "../../api/admin";
import { paymentMethodLabel } from "../../api/payments";
import { useStrings } from "../../context/LanguageContext";
import AdminListItem from "./AdminListItem";
import EmptyState from "./EmptyState";
import MasterDetail from "./MasterDetail";
import PanelHeader from "./PanelHeader";
import { ago, money } from "./format";
import { useAdminBill } from "./AdminBillContext";
import { adminStatusLabel, adminStatusTone } from "./adminLabels";
import { ticketStatusLabel } from "./ticketStatus";

const STATUSES = [
  "PENDING",
  "HELD",
  "CONFIRMED",
  "REFUNDED",
  "PARTIAL",
  "DISPUTED",
  "CANCELLED",
];

function ticketColor(status: string | null): "success" | "warning" | "error" | "default" {
  if (status === "4") return "success";
  if (status === "5" || status === "8" || status === "12" || status === "15") return "error";
  if (status === "1" || status === "2" || status === "3" || status === "6" || status === "7" || status === "9" || status === "10" || status === "11" || status === "13" || status === "14") return "warning";
  return "default";
}

export default function PaymentsAdminPanel({ token }: { token: string | null }) {
  const { t } = useStrings();
  const { openBill } = useAdminBill();
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [status, setStatus] = useState("ALL");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(key: string, nextStatus: string) {
    setError(null);
    try {
      setPayments(await adminPayments(key, nextStatus === "ALL" ? undefined : nextStatus));
    } catch (err) {
      setError(toMessage(err));
    }
  }

  useEffect(() => {
    if (token) void load(token, status);
  }, [token, status]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter(
      (payment) =>
        payment.id.toLowerCase().includes(q) ||
        payment.ticketId.toLowerCase().includes(q),
    );
  }, [payments, query]);

  const groups = useMemo(() => {
    const map = new Map<string, AdminPayment[]>();
    for (const payment of visible) {
      const rows = map.get(payment.ticketId) ?? [];
      rows.push(payment);
      map.set(payment.ticketId, rows);
    }
    return [...map.entries()]
      .map(([ticketId, rows]) => ({ ticketId, rows }))
      .sort((a, b) =>
        (b.rows[0]?.createdAt ?? "").localeCompare(a.rows[0]?.createdAt ?? ""),
      );
  }, [visible]);

  const selected = payments.find((payment) => payment.id === selectedId) ?? null;

  return (
    <Box>
      <PanelHeader
        title={t.admin.payments}
        onRefresh={() => token && void load(token, status)}
        refreshLabel={t.admin.refresh}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t.admin.paymentsLede}
      </Typography>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
        <TextField
          size="small"
          label={t.admin.paymentSearch}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 220 }}
        />
        <TextField
          select
          size="small"
          label={t.admin.status}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="ALL">{t.admin.allStatuses}</MenuItem>
          {STATUSES.map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      {visible.length === 0 ? (
        <EmptyState message={t.admin.noPayments} />
      ) : (
        <MasterDetail
          empty={t.admin.selectPrompt}
          list={groups.map((group) => {
            const disputed = group.rows.some(
              (row) => row.disputeId && !row.disputeResolvedAt,
            );
            return (
              <Accordion
                key={group.ticketId}
                disableGutters
                sx={{ border: 1, borderColor: "divider", borderRadius: 2, "&:before": { display: "none" } }}
              >
                <AccordionSummary expandIcon={<ChevronRightIcon />} sx={{ px: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", pr: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap sx={{ minWidth: 0 }}>
                      {`${t.admin.ticketContext}: ${group.ticketId}`}
                    </Typography>
                    <Chip size="small" label={group.rows.length} sx={{ ml: "auto" }} />
                    {disputed ? (
                      <Chip size="small" color="warning" label={t.admin.disputed} />
                    ) : (
                      <Chip
                        size="small"
                        color={adminStatusTone(group.rows[0]?.status ?? "")}
                        label={adminStatusLabel(group.rows[0]?.status ?? "", t)}
                      />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                  {group.rows.map((payment) => (
                    <AdminListItem
                      key={payment.id}
                      selected={payment.id === selectedId}
                      onClick={() => setSelectedId(payment.id)}
                      title={`${money(payment.amount)} · ${payment.riderName ?? payment.riderUid}`}
                      subtitle={`${payment.payeeName ?? payment.payeeId} · ${paymentMethodLabel(payment.method)} · ${ago(payment.createdAt, t)}`}
                      chip={adminStatusLabel(payment.status, t)}
                      chipColor={adminStatusTone(payment.status)}
                      trailing={
                        payment.disputeId && !payment.disputeResolvedAt ? (
                          <Chip size="small" color="warning" label={t.admin.disputed} />
                        ) : undefined
                      }
                    />
                  ))}
                </AccordionDetails>
              </Accordion>
            );
          })}
          detail={
            selected ? (
              <Card>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {money(selected.amount)}
                    </Typography>
                    <Chip size="small" label={adminStatusLabel(selected.status, t)} color={adminStatusTone(selected.status)} />
                    <Chip size="small" variant="outlined" label={paymentMethodLabel(selected.method)} />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {`${selected.id} · ${formatDateTimeDMY(selected.createdAt)}`}
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Typography variant="body2">
                      {`${t.admin.paymentRider}: ${selected.riderName ?? selected.riderUid}${selected.riderEmail ? ` · ${selected.riderEmail}` : ""}`}
                    </Typography>
                    <Typography variant="body2">
                      {`${t.admin.paymentPayee}: ${selected.payeeName ?? selected.payeeId}${selected.payeeKind ? ` · ${selected.payeeKind}` : ""}`}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                      <Typography variant="body2">{`${t.admin.ticketContext}: ${selected.ticketId}`}</Typography>
                      {selected.ticketStatus ? (
                        <Chip
                          size="small"
                          color={ticketColor(selected.ticketStatus)}
                          label={`${selected.ticketType ?? ""} ${ticketStatusLabel(selected.ticketStatus, t)}`.trim()}
                        />
                      ) : null}
                    </Box>
                  </Box>
                  <Typography variant="body2">
                    {`${t.admin.paymentCommission}: ${selected.commissionAmount === null ? "—" : money(selected.commissionAmount)}${selected.commissionRate === null ? "" : ` (${selected.commissionRate}%)`}`}
                  </Typography>
                  <Typography variant="body2">
                    {`${t.admin.paymentPayout}: ${selected.payoutAmount === null ? "—" : money(selected.payoutAmount)} · ${t.admin.paymentRefunded}: ${selected.refundAmount === null ? "—" : money(selected.refundAmount)}`}
                  </Typography>
                  {selected.disputeId ? (
                    <Typography variant="caption" color="text.secondary">
                      {`${t.admin.disputed}${selected.disputedAt ? ` · ${formatDateTimeDMY(selected.disputedAt)}` : ""}${selected.disputeResolvedAt ? ` · ${t.admin.resolved}` : ""}`}
                    </Typography>
                  ) : null}
                  {selected.confirmedAt ? (
                    <Typography variant="caption" color="text.secondary">
                      {`${formatDateTimeDMY(selected.confirmedAt)}`}
                    </Typography>
                  ) : null}
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ alignSelf: "flex-start" }}
                    onClick={() => openBill(selected.ticketId)}
                  >
                    {`${t.admin.viewBill} · ${selected.ticketId}`}
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
