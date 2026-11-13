import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import {
  adminDismissDispute,
  adminResolveDispute,
  type AdminDispute,
} from "../../api/admin";
import { useStrings } from "../../context/LanguageContext";
import TicketTimeline from "./TicketTimeline";
import { ago, money } from "./format";
import { useAdminBill } from "./AdminBillContext";
import { adminStatusLabel, adminStatusTone, disputeOutcomeLabel, humanizeEnum } from "./adminLabels";
import { ticketStatusLabel } from "./ticketStatus";

export default function DisputeCaseDialog({
  token,
  dispute,
  onClose,
  onDecided,
}: {
  token: string | null;
  dispute: AdminDispute;
  onClose: () => void;
  onDecided: () => void;
}) {
  const { t } = useStrings();
  const { openBill } = useAdminBill();
  const context = dispute.context;
  const ticket = context?.ticket ?? null;
  const [outcome, setOutcome] = useState("SHOP");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(dismiss: boolean): Promise<void> {
    if (!token || busy) return;
    if (note.trim() === "") {
      setError(t.admin.noteRequired);
      return;
    }
    if (!dismiss && outcome === "PARTIAL" && amount.trim() === "") {
      setError(t.admin.partialAmount);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (dismiss) {
        await adminDismissDispute(token, {
          disputeId: dispute.id,
          resolution: note.trim(),
        });
      } else {
        await adminResolveDispute(token, {
          disputeId: dispute.id,
          outcome,
          resolution: note.trim(),
          ...(outcome === "PARTIAL" ? { adjustedAmount: Number(amount) } : {}),
        });
      }
      onDecided();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg" slotProps={{ paper: { sx: { maxHeight: "90vh" } } }}>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>{`${humanizeEnum(dispute.type)} · ${dispute.ticketId}`}</Typography>
          <Chip size="small" label={adminStatusLabel(dispute.status, t)} color={adminStatusTone(dispute.status)} />
          {dispute.hold ? <Chip size="small" color="error" label={t.admin.statusHeld} /> : null}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {`${t.admin.filed}: ${ago(dispute.createdAt, t)}${dispute.outcome ? ` · ${t.admin.outcome}: ${disputeOutcomeLabel(dispute.outcome, t)}` : ""}`}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {dispute.hold ? <Alert severity="warning">{t.admin.disputeHoldNote}</Alert> : null}
        {ticket ? (
          <Box>
            <Typography variant="subtitle2">{t.admin.ticketContext}</Typography>
            <Typography variant="body2">
              {`${ticket.ticketType} · ${ticketStatusLabel(ticket.status, t)}${ticket.paymentStatus ? ` · ${adminStatusLabel(ticket.paymentStatus, t)}` : ""}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {`${t.admin.quote}: ${ticket.quoteAmount === null ? "—" : money(ticket.quoteAmount)} · ${t.admin.currentCharge}: ${ticket.finalAmount === null ? "—" : money(ticket.finalAmount)}`}
            </Typography>
            <TicketTimeline history={ticket.statusHistory} t={t} />
          </Box>
        ) : null}
        <Button size="small" variant="outlined" sx={{ alignSelf: "flex-start" }} onClick={() => openBill(dispute.ticketId)}>
          {`${t.admin.viewBill} · ${dispute.ticketId}`}
        </Button>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 1.5 }}>
            <Typography variant="subtitle2">{t.admin.riderParty}</Typography>
            <Typography variant="body2">{context?.rider?.name ?? t.admin.riderParty}</Typography>
            <Typography variant="caption" color="text.secondary">{context?.rider?.email ?? dispute.filedBy}</Typography>
            <Typography variant="caption" color="text.secondary">
              {`${t.admin.rating}: ${context?.rider ? context.rider.ratingAvg.toFixed(1) : "—"} · ${t.admin.trust}: ${context?.rider?.trustScore ?? 0}`}
            </Typography>
          </Box>
          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 1.5 }}>
            <Typography variant="subtitle2">{t.admin.providerParty}</Typography>
            <Typography variant="body2">{context?.provider?.name ?? t.admin.providerParty}</Typography>
            <Typography variant="caption" color="text.secondary">
              {context?.provider ? `${humanizeEnum(context.provider.kind)} · ${adminStatusLabel(context.provider.status, t)}` : dispute.accusedId ?? dispute.accusedKind}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {`${t.admin.rating}: ${context?.provider ? context.provider.ratingAvg.toFixed(1) : "—"} · ${t.admin.declines}: ${context?.provider?.declineCount ?? 0}`}
            </Typography>
          </Box>
        </Box>
        <Box>
          <Typography variant="subtitle2">{t.admin.evidence}</Typography>
          {dispute.note ? <Typography variant="body2">{dispute.note}</Typography> : null}
          {dispute.resolution ? <Typography variant="caption" color="text.secondary">{dispute.resolution}</Typography> : null}
        </Box>
        {dispute.status === "OPEN" ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="subtitle2">{t.admin.outcome}</Typography>
            <TextField select size="small" value={outcome} onChange={(event) => setOutcome(event.target.value)}>
              <MenuItem value="SHOP">{t.admin.outcomeProviderFavor}</MenuItem>
              <MenuItem value="RIDER">{t.admin.outcomeRiderFavor}</MenuItem>
              <MenuItem value="PARTIAL">{t.admin.outcomePartial}</MenuItem>
            </TextField>
            {outcome === "PARTIAL" ? (
              <TextField size="small" type="number" label={t.admin.warrantyRefund} value={amount} onChange={(event) => setAmount(event.target.value)} />
            ) : null}
            <TextField size="small" label={t.admin.reviewNote} value={note} onChange={(event) => setNote(event.target.value)} multiline minRows={2} />
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t.common.close}</Button>
        {dispute.status === "OPEN" ? (
          <>
            <Button color="error" disabled={busy} onClick={() => void decide(true)}>{t.admin.dismiss}</Button>
            <Button variant="contained" disabled={busy} onClick={() => void decide(false)}>{t.admin.resolve}</Button>
          </>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
