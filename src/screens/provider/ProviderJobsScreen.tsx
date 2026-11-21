import { formatDateTimeDMY } from "../../utils/date";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
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
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import { toMessage } from "../../api/client";
import {
  acceptTicket,
  declineTicket,
  sendQuote,
  shopRecords,
  shopRequests,
  updateTicketStatus,
  updateWorkOrder,
  type DeclineReason,
  type ShopTicket,
} from "../../api/dispatch";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Screen from "../../components/ui/Screen";
import { useStrings } from "../../context/LanguageContext";
import type { Strings } from "../../i18n";
import {
  providerStatusColor,
  providerStatusLabel,
  statusGroup,
  walkInActions,
} from "./actions";
import LineItemsEditor, {
  draftsFromItems,
  draftsToItems,
  draftsTotal,
  type LineDraft,
} from "./LineItemsEditor";
import ShopSelect from "./ShopSelect";
import useMyShops from "./useMyShops";

const DECLINE_REASONS: DeclineReason[] = [
  "FULL",
  "CLOSED",
  "PARTS_DELAY",
  "OTHER",
];

function isWalkIn(ticket: ShopTicket): boolean {
  return ticket.ticketType === "WALK_IN";
}

function money(value: number): string {
  return `${Math.round(value).toLocaleString()} VND`;
}

function createdAtLabel(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : formatDateTimeDMY(date);
}

function JobCard({
  t,
  ticket,
  busy,
  onAccept,
  onDecline,
  onQuote,
  onWork,
  onReady,
}: {
  t: Strings;
  ticket: ShopTicket;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onQuote: () => void;
  onWork: () => void;
  onReady: () => void;
}) {
  const actions = walkInActions(ticket.status);
  const rider = ticket.riderName?.trim() || `#${ticket.userId.slice(-6)}`;
  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>
            {`#${ticket.id.slice(-6)} · ${rider}`}
          </Typography>
          <Chip
            size="small"
            color={providerStatusColor(ticket.status)}
            label={providerStatusLabel(ticket.status, t)}
          />
        </Box>
        {ticket.vehicleLabel || ticket.vehiclePlate ? (
          <Typography variant="body2">
            {[ticket.vehicleLabel, ticket.vehiclePlate].filter(Boolean).join(" · ")}
          </Typography>
        ) : null}
        {ticket.symptom ? <Typography variant="body2">{ticket.symptom}</Typography> : null}
        {ticket.description ? (
          <Typography variant="body2" color="text.secondary">{ticket.description}</Typography>
        ) : null}
        {ticket.note ? (
          <Typography variant="body2" color="text.secondary">{ticket.note}</Typography>
        ) : null}
        <Typography variant="caption" color="text.secondary">
          {createdAtLabel(ticket.createdAt)}
        </Typography>
        {ticket.shopQuotedAmount !== null && ticket.shopQuotedAmount !== undefined ? (
          <Typography variant="body2">
            {`${t.provider.quoteAmount}: ${money(ticket.shopQuotedAmount)}`}
          </Typography>
        ) : null}
        {ticket.finalAmount !== null && ticket.finalAmount !== undefined ? (
          <Typography variant="body2">
            {`${t.provider.finalAmount}: ${money(ticket.finalAmount)}`}
          </Typography>
        ) : null}
        {ticket.invoiceAmount !== null && ticket.invoiceAmount !== undefined &&
          ticket.invoiceAmount !== ticket.shopQuotedAmount ? (
          <Typography variant="body2">
            {`${t.provider.invoiceAmount}: ${money(ticket.invoiceAmount)}`}
          </Typography>
        ) : null}
        {ticket.invoiceApproval === "PENDING" ? (
          <Typography variant="caption" color="warning.main">{t.provider.invoicePending}</Typography>
        ) : null}
        {ticket.status === "7" ? (
          <Typography variant="caption" color="text.secondary">{t.provider.waitingRider}</Typography>
        ) : null}
        {actions.length > 0 ? (
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", flexWrap: "wrap", mt: 1 }}>
            {actions.includes("decline") ? (
              <Button color="error" onClick={onDecline} disabled={busy}>
                {t.bookings.decline}
              </Button>
            ) : null}
            {actions.includes("accept") ? (
              <Button variant="contained" onClick={onAccept} disabled={busy}>
                {t.bookings.accept}
              </Button>
            ) : null}
            {actions.includes("quote") ? (
              <Button variant="contained" onClick={onQuote} disabled={busy}>
                {ticket.shopQuotedAmount !== null && ticket.shopQuotedAmount !== undefined ?
                  t.provider.amendQuote :
                  t.provider.sendQuote}
              </Button>
            ) : null}
            {actions.includes("work") ? (
              <Button variant="outlined" onClick={onWork} disabled={busy}>
                {t.provider.workTitle}
              </Button>
            ) : null}
            {actions.includes("ready") ? (
              <Button variant="contained" color="success" onClick={onReady} disabled={busy}>
                {t.provider.markReady}
              </Button>
            ) : null}
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
}

function JobSection({
  title,
  rows,
  render,
}: {
  title: string;
  rows: ShopTicket[];
  render: (ticket: ShopTicket) => ReactNode;
}) {
  if (rows.length === 0) return null;
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="overline" color="text.secondary">{title}</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 0.5 }}>
        {rows.map(render)}
      </Box>
    </Box>
  );
}

export default function ProviderJobsScreen() {
  const { t } = useStrings();
  const navigate = useNavigate();
  const { token, shops, shopId, setShopId, loading: shopsLoading, error: shopsError } = useMyShops();
  const [requests, setRequests] = useState<ShopTicket[]>([]);
  const [records, setRecords] = useState<ShopTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declineFor, setDeclineFor] = useState<ShopTicket | null>(null);
  const [declineReason, setDeclineReason] = useState<DeclineReason>("FULL");
  const [declineNote, setDeclineNote] = useState("");
  const [quoteFor, setQuoteFor] = useState<ShopTicket | null>(null);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteWorkType, setQuoteWorkType] = useState("");
  const [quoteLines, setQuoteLines] = useState<LineDraft[]>([{ name: "", qty: "1", unitPrice: "" }]);
  const [workFor, setWorkFor] = useState<ShopTicket | null>(null);
  const [workType, setWorkType] = useState("");
  const [workInvoiceRef, setWorkInvoiceRef] = useState("");
  const [workWarrantyDays, setWorkWarrantyDays] = useState("");
  const [workLines, setWorkLines] = useState<LineDraft[]>([{ name: "", qty: "1", unitPrice: "" }]);
  const [readyFor, setReadyFor] = useState<ShopTicket | null>(null);

  const load = useCallback(async () => {
    if (!token || !shopId) {
      setRequests([]);
      setRecords([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [pending, recent] = await Promise.all([
        shopRequests(shopId, token),
        shopRecords(shopId, 50, token),
      ]);
      setRequests(pending.filter(isWalkIn));
      setRecords(recent.filter(isWalkIn));
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token, shopId]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, ShopTicket>();
    for (const row of records) map.set(row.id, row);
    for (const row of requests) map.set(row.id, row);
    const all = [...map.values()].sort((a, b) =>
      String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    return {
      new: all.filter((row) => statusGroup(row.status) === "new"),
      active: all.filter((row) => statusGroup(row.status) === "active"),
      closed: all.filter((row) => statusGroup(row.status) === "closed"),
    };
  }, [requests, records]);

  function openQuote(ticket: ShopTicket): void {
    setError(null);
    setQuoteFor(ticket);
    setQuoteAmount(ticket.shopQuotedAmount !== null && ticket.shopQuotedAmount !== undefined ?
      String(ticket.shopQuotedAmount) :
      "");
    setQuoteWorkType(ticket.workType ?? "");
    setQuoteLines(draftsFromItems(ticket.quoteItems));
  }

  function openWork(ticket: ShopTicket): void {
    setError(null);
    setWorkFor(ticket);
    setWorkType(ticket.workType ?? "");
    setWorkInvoiceRef(ticket.invoiceRef ?? "");
    setWorkWarrantyDays("");
    setWorkLines(draftsFromItems(ticket.invoiceItems ?? ticket.quoteItems));
  }

  async function accept(ticket: ShopTicket): Promise<void> {
    if (!token || busyId !== null) return;
    setBusyId(ticket.id);
    setError(null);
    try {
      await acceptTicket(ticket.id, shopId, token);
      setNotice(t.provider.jobAccepted);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function decline(): Promise<void> {
    const ticket = declineFor;
    if (!ticket || !token || busyId !== null) return;
    setBusyId(ticket.id);
    setError(null);
    try {
      await declineTicket(
        ticket.id,
        shopId,
        declineReason,
        declineNote.trim() || undefined,
        token,
      );
      setDeclineFor(null);
      setDeclineNote("");
      setNotice(t.provider.jobDeclined);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function submitQuote(): Promise<void> {
    const ticket = quoteFor;
    if (!ticket || !token || busyId !== null) return;
    const amount = Number(quoteAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t.provider.quoteInvalid);
      return;
    }
    const items = draftsToItems(quoteLines);
    if (items.length > 0 && Math.round(amount) !== draftsTotal(quoteLines)) {
      setError(t.provider.quoteItemsMismatch);
      return;
    }
    setBusyId(ticket.id);
    setError(null);
    try {
      await sendQuote(ticket.id, {
        quotedAmount: Math.round(amount),
        ...(quoteWorkType.trim() ? { workType: quoteWorkType.trim() } : {}),
        items,
      }, token);
      setQuoteFor(null);
      setNotice(t.provider.jobQuoted);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function submitWork(): Promise<void> {
    const ticket = workFor;
    if (!ticket || !token || busyId !== null) return;
    const warrantyDays = workWarrantyDays.trim() === "" ? undefined : Number(workWarrantyDays);
    if (warrantyDays !== undefined &&
      (!Number.isFinite(warrantyDays) || warrantyDays < 0 || warrantyDays > 90)) {
      setError(t.provider.workInvalid);
      return;
    }
    setBusyId(ticket.id);
    setError(null);
    try {
      await updateWorkOrder({
        ticketId: ticket.id,
        ...(workType.trim() ? { workType: workType.trim() } : {}),
        ...(workInvoiceRef.trim() ? { invoiceRef: workInvoiceRef.trim() } : {}),
        ...(warrantyDays !== undefined ? { warrantyDays: Math.round(warrantyDays) } : {}),
        items: draftsToItems(workLines),
      }, token);
      setWorkFor(null);
      setNotice(t.provider.jobWorkSaved);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function markReady(): Promise<void> {
    const ticket = readyFor;
    if (!ticket || !token || busyId !== null) return;
    setBusyId(ticket.id);
    setError(null);
    try {
      await updateTicketStatus(ticket.id, "7", token);
      setReadyFor(null);
      setNotice(t.provider.jobReady);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen maxWidth="lg">
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/more")}>
        {t.common.back}
      </Button>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">{t.provider.walkInJobs}</Typography>
          <Typography variant="body2" color="text.secondary">{t.provider.walkInJobsHint}</Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} onClick={() => void load()} disabled={loading || !shopId}>
          {t.provider.refresh}
        </Button>
      </Box>
      <ShopSelect shops={shops} shopId={shopId} t={t} onChange={setShopId} />
      {shopsError ? <Alert severity="error" sx={{ mt: 2 }}>{shopsError}</Alert> : null}
      {!shopsLoading && shops.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>{t.provider.noShop}</Alert>
      ) : null}
      {error ? <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mt: 2 }} onClose={() => setNotice(null)}>{notice}</Alert> : null}
      {shopsLoading || loading ? <LinearProgress sx={{ mt: 2 }} /> : null}
      {!loading && shops.length > 0 &&
        grouped.new.length + grouped.active.length + grouped.closed.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>{t.provider.noWalkIns}</Alert>
      ) : null}
      <JobSection
        title={t.provider.newRequests}
        rows={grouped.new}
        render={(ticket) => (
          <JobCard
            key={ticket.id}
            t={t}
            ticket={ticket}
            busy={busyId === ticket.id}
            onAccept={() => void accept(ticket)}
            onDecline={() => {
              setError(null);
              setDeclineFor(ticket);
              setDeclineReason("FULL");
              setDeclineNote("");
            }}
            onQuote={() => openQuote(ticket)}
            onWork={() => openWork(ticket)}
            onReady={() => {
              setError(null);
              setReadyFor(ticket);
            }}
          />
        )}
      />
      <JobSection
        title={t.provider.activeWork}
        rows={grouped.active}
        render={(ticket) => (
          <JobCard
            key={ticket.id}
            t={t}
            ticket={ticket}
            busy={busyId === ticket.id}
            onAccept={() => void accept(ticket)}
            onDecline={() => {
              setError(null);
              setDeclineFor(ticket);
              setDeclineReason("FULL");
              setDeclineNote("");
            }}
            onQuote={() => openQuote(ticket)}
            onWork={() => openWork(ticket)}
            onReady={() => {
              setError(null);
              setReadyFor(ticket);
            }}
          />
        )}
      />
      <JobSection
        title={t.provider.closedWork}
        rows={grouped.closed}
        render={(ticket) => (
          <JobCard
            key={ticket.id}
            t={t}
            ticket={ticket}
            busy={false}
            onAccept={() => undefined}
            onDecline={() => undefined}
            onQuote={() => undefined}
            onWork={() => undefined}
            onReady={() => undefined}
          />
        )}
      />

      <Dialog open={declineFor !== null} onClose={() => setDeclineFor(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t.provider.declineJobTitle}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            select
            label={t.provider.declineReason}
            value={declineReason}
            onChange={(event) => setDeclineReason(event.target.value as DeclineReason)}
          >
            {DECLINE_REASONS.map((reason) => (
              <MenuItem key={reason} value={reason}>
                {reason === "FULL" ? t.provider.declineFull :
                  reason === "CLOSED" ? t.provider.declineClosed :
                    reason === "PARTS_DELAY" ? t.provider.declineParts :
                      t.provider.declineOther}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t.provider.declineNote}
            value={declineNote}
            onChange={(event) => setDeclineNote(event.target.value)}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeclineFor(null)}>{t.common.cancel}</Button>
          <Button color="error" variant="contained" onClick={() => void decline()} disabled={busyId !== null}>
            {t.bookings.decline}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={quoteFor !== null} onClose={() => setQuoteFor(null)} fullWidth maxWidth="sm">
        <DialogTitle>{quoteFor?.shopQuotedAmount !== null && quoteFor?.shopQuotedAmount !== undefined ? t.provider.amendQuote : t.provider.quoteTitle}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            label={t.provider.quoteAmount}
            type="number"
            value={quoteAmount}
            onChange={(event) => setQuoteAmount(event.target.value)}
          />
          <TextField
            label={t.provider.workType}
            value={quoteWorkType}
            onChange={(event) => setQuoteWorkType(event.target.value)}
          />
          <Typography variant="subtitle2">{t.provider.lineName}</Typography>
          <LineItemsEditor
            t={t}
            lines={quoteLines}
            onChange={(lines) => {
              setQuoteLines(lines);
              const total = draftsTotal(lines);
              if (total > 0) setQuoteAmount(String(total));
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuoteFor(null)}>{t.common.cancel}</Button>
          <Button variant="contained" onClick={() => void submitQuote()} disabled={busyId !== null}>
            {quoteFor?.shopQuotedAmount !== null && quoteFor?.shopQuotedAmount !== undefined ?
              t.provider.amendQuote :
              t.provider.sendQuote}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={workFor !== null} onClose={() => setWorkFor(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t.provider.workTitle}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Typography variant="body2" color="text.secondary">
            {workFor?.shopQuotedAmount !== null && workFor?.shopQuotedAmount !== undefined ?
              t.provider.invoiceHint.replace("{amount}", money(workFor.shopQuotedAmount)) :
              t.provider.invoiceHintNoQuote}
          </Typography>
          <TextField
            label={t.provider.workType}
            value={workType}
            onChange={(event) => setWorkType(event.target.value)}
          />
          <TextField
            label={t.provider.invoiceRef}
            value={workInvoiceRef}
            onChange={(event) => setWorkInvoiceRef(event.target.value)}
          />
          <TextField
            label={t.provider.warrantyDays}
            type="number"
            value={workWarrantyDays}
            onChange={(event) => setWorkWarrantyDays(event.target.value)}
          />
          <Typography variant="subtitle2">{t.provider.lineName}</Typography>
          <LineItemsEditor t={t} lines={workLines} onChange={setWorkLines} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWorkFor(null)}>{t.common.cancel}</Button>
          <Button variant="contained" onClick={() => void submitWork()} disabled={busyId !== null}>
            {t.common.save}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={readyFor !== null}
        title={t.provider.markReadyTitle}
        message={t.provider.markReadyMessage}
        confirmLabel={t.provider.markReady}
        cancelLabel={t.common.cancel}
        busy={busyId !== null}
        error={error}
        onClose={() => setReadyFor(null)}
        onConfirm={() => void markReady()}
      />
    </Screen>
  );
}
