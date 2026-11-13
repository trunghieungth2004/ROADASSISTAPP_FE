import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import {
  fetchBill,
  requestInvoice,
  type Bill,
  type BillItem,
} from "../../api/bills";
import { paymentMethodLabel, paymentStatusLabel } from "../../api/payments";
import { useStrings } from "../../context/LanguageContext";
import EmptyState from "./EmptyState";
import { money } from "./format";
import { adminStatusLabel, adminStatusTone, humanizeEnum } from "./adminLabels";

function billStatusLabel(value: string, t: ReturnType<typeof useStrings>["t"]): string {
  if (value === "PARTIAL") return t.admin.statusPartiallyPaid;
  if (value === "UNPAID") return t.admin.statusUnpaid;
  if (value === "VOID") return t.admin.statusVoid;
  return adminStatusLabel(value, t);
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="caption">{value}</Typography>
    </Box>
  );
}

function BillItemCard({ item }: { item: BillItem }) {
  const { t } = useStrings();
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 1.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          {`${item.ticketType} · ${item.ticketId}`}
        </Typography>
        <Chip size="small" color={adminStatusTone(item.status)} label={adminStatusLabel(item.status, t)} />
      </Box>
      <Typography variant="body2">{money(item.amount)}</Typography>
      {item.payeeName ? <Line label={t.admin.paymentPayee} value={item.payeeName} /> : null}
      {(item.breakdown ?? []).map((line, index) => (
        <Line
          key={`${line.label}-${index}`}
          label={line.detail ? `${line.label} · ${line.detail}` : line.label}
          value={money(line.amount)}
        />
      ))}
      {(item.services ?? []).length > 0 ? (
        <>
          <Divider />
          <Typography variant="caption" sx={{ fontWeight: 700 }}>{t.bills.services}</Typography>
          {(item.services ?? []).map((line, index) => (
            <Line
              key={line.lineId ?? `${line.name}-${index}`}
              label={`${line.name} × ${line.qty}`}
              value={money(line.amount)}
            />
          ))}
        </>
      ) : null}
      {(item.extras ?? []).length > 0 ? (
        <>
          <Divider />
          <Typography variant="caption" sx={{ fontWeight: 700 }}>{t.bills.extras}</Typography>
          {(item.extras ?? []).map((line, index) => (
            <Line
              key={line.lineId ?? `${line.name}-${index}`}
              label={`${line.name} × ${line.qty}`}
              value={money(line.amount)}
            />
          ))}
        </>
      ) : null}
      {item.payment ? (
        <>
          <Divider />
          <Typography variant="caption" color="text.secondary">
            {`${paymentMethodLabel(item.payment.method)} · ${paymentStatusLabel(item.payment.status)}`}
          </Typography>
        </>
      ) : null}
      {item.refundRequest ? (
        <Typography variant="caption" color="warning.main">
          {`${t.bills.refund}: ${adminStatusLabel(item.refundRequest.status, t)} · ${money(item.refundRequest.amount)}`}
        </Typography>
      ) : null}
      {item.dispute ? (
        <Typography variant="caption" color="text.secondary">
          {`${t.bills.dispute}: ${adminStatusLabel(item.dispute.status, t)} · ${humanizeEnum(item.dispute.type)}`}
        </Typography>
      ) : null}
      {item.warrantyUntil ? (
        <Typography variant="caption" color="success.main">
          {`${t.bills.warranty}: ${new Date(item.warrantyUntil).toLocaleDateString()}`}
        </Typography>
      ) : null}
    </Box>
  );
}

export default function AdminBillDialog({
  token,
  ticketId,
  onClose,
}: {
  token: string | null;
  ticketId: string | null;
  onClose: () => void;
}) {
  const { t } = useStrings();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceBusy, setInvoiceBusy] = useState(false);

  useEffect(() => {
    if (!token || !ticketId) {
      setBill(null);
      setError(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    void fetchBill(token, { ticketId })
      .then((next) => {
        if (active) setBill(next);
      })
      .catch((err) => {
        if (active) setError(toMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, ticketId]);

  async function openInvoice(): Promise<void> {
    if (!token || !bill || invoiceBusy) return;
    setInvoiceBusy(true);
    try {
      const invoice = await requestInvoice(bill.ticketId, token);
      window.open(invoice.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setInvoiceBusy(false);
    }
  }

  return (
    <Dialog open={ticketId !== null} onClose={onClose} fullWidth maxWidth="md" slotProps={{ paper: { sx: { maxHeight: "90vh" } } }}>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>{t.admin.viewBill}</Typography>
          {ticketId ? <Chip size="small" variant="outlined" label={ticketId} /> : null}
          {bill ? <Chip size="small" label={billStatusLabel(bill.status, t)} color={adminStatusTone(bill.status)} /> : null}
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Alert severity="info">{t.admin.billReadOnly}</Alert>
        {loading ? <CircularProgress size={24} /> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        {bill ? (
          <>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography variant="subtitle2">{`${bill.ticketType} · ${bill.billId}`}</Typography>
              <Typography variant="caption" color="text.secondary">
                {bill.createdAt ? new Date(bill.createdAt).toLocaleString() : ""}
              </Typography>
              <Line label={t.bills.total} value={money(bill.total)} />
              <Line label={t.bills.paid} value={money(bill.paid)} />
              <Line label={t.bills.due} value={money(bill.due)} />
            </Box>
            <Divider />
            {bill.items.length === 0 ? (
              <EmptyState message={t.admin.billNoItems} />
            ) : bill.items.map((item) => <BillItemCard key={item.ticketId} item={item} />)}
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t.common.close}</Button>
        {bill && bill.status === "PAID" ? (
          <Button variant="outlined" disabled={invoiceBusy} onClick={() => void openInvoice()}>
            {t.bills.invoicePdf}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
