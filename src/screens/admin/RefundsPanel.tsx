import { useEffect, useMemo, useState } from "react";
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
import { toMessage } from "../../api/client";
import {
  adminRefundConfirm,
  adminRefundDecide,
  adminRefundFail,
  adminRefundSend,
  adminRefunds,
  type AdminRefund,
} from "../../api/admin";
import { useStrings } from "../../context/LanguageContext";
import AdminListItem from "./AdminListItem";
import MasterDetail from "./MasterDetail";
import EmptyState from "./EmptyState";
import PanelHeader from "./PanelHeader";
import SettingField from "./SettingField";
import { useAdminQueue } from "./AdminQueueContext";
import { useAdminBill } from "./AdminBillContext";
import { adminStatusLabel, adminStatusTone } from "./adminLabels";
import { ago, maskAccount, money } from "./format";
import { ticketStatusLabel } from "./ticketStatus";

const STATUSES = ["REQUESTED", "APPROVED", "SENT", "CONFIRMED", "REJECTED", "FAILED"];

type Action = "approve" | "reject" | "send" | "confirm" | "fail";

export default function RefundsPanel({ token }: { token: string | null }) {
  const { t } = useStrings();
  const { openBill } = useAdminBill();
  const { refresh } = useAdminQueue();
  const [refunds, setRefunds] = useState<AdminRefund[]>([]);
  const [status, setStatus] = useState("REQUESTED");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(key: string, nextStatus: string) {
    setError(null);
    try {
      setRefunds(await adminRefunds(key, nextStatus || undefined));
    } catch (err) {
      setError(toMessage(err));
    }
  }

  useEffect(() => {
    if (token) void load(token, status);
  }, [token, status]);

  const selected = refunds.find((refund) => refund.id === selectedId) ?? null;
  const duplicate = useMemo(
    () =>
      selected !== null &&
      refunds.some(
        (refund) =>
          refund.id !== selected.id && refund.paymentId === selected.paymentId,
      ),
    [refunds, selected],
  );

  function select(refund: AdminRefund) {
    setSelectedId(refund.id);
    setNotice(null);
  }

  function nextStep(refund: AdminRefund): string {
    if (refund.status === "REQUESTED") return t.admin.refundNextRequested;
    if (refund.status === "APPROVED") return t.admin.refundNextApproved;
    if (refund.status === "SENT") return t.admin.refundNextSent;
    return t.admin.refundNextDone;
  }

  function needsRef(action: Action): boolean {
    return action === "send" || action === "confirm" || action === "fail";
  }

  function ask(action: Action) {
    if (!selected) return;
    if (needsRef(action) && (refs[selected.id] ?? selected.transferRef ?? "").trim() === "") {
      setError(t.admin.transferRefRequired);
      return;
    }
    setError(null);
    setConfirm(action);
  }

  async function run(action: Action) {
    if (!token || !selected || busy) return;
    const ref = refs[selected.id] ?? selected.transferRef ?? undefined;
    setBusy(true);
    setError(null);
    try {
      if (action === "approve") {
        await adminRefundDecide(token, selected.id, true);
      } else if (action === "reject") {
        await adminRefundDecide(token, selected.id, false);
      } else if (action === "send") {
        await adminRefundSend(token, selected.id, ref);
      } else if (action === "confirm") {
        await adminRefundConfirm(token, selected.id, ref);
      } else {
        await adminRefundFail(token, selected.id, ref);
      }
      setConfirm(null);
      await load(token, status);
      refresh();
      setNotice(t.admin.saved);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const confirmLabel =
    confirm === "approve"
      ? t.admin.confirmRefundApprove
      : confirm === "reject"
        ? t.admin.confirmRefundReject
        : confirm === "send"
          ? t.admin.confirmRefundSend
          : confirm === "confirm"
            ? t.admin.confirmRefundConfirm
            : t.admin.confirmRefundFail;

  return (
    <Box>
      <PanelHeader
        title={t.admin.refundsQueue}
        onRefresh={() => token && void load(token, status)}
        refreshLabel={t.admin.refresh}
        action={
          <TextField
            select
            size="small"
            label={t.admin.status}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">{t.admin.all}</MenuItem>
            {STATUSES.map((value) => (
              <MenuItem key={value} value={value}>
                {adminStatusLabel(value, t)}
              </MenuItem>
            ))}
          </TextField>
        }
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert> : null}
      {refunds.length === 0 ? (
        <EmptyState message={t.admin.noRefunds} />
      ) : (
        <MasterDetail
          empty={t.admin.selectPrompt}
          list={refunds.map((refund) => (
            <AdminListItem
              key={refund.id}
              selected={refund.id === selectedId}
              onClick={() => select(refund)}
              title={money(refund.amount)}
              subtitle={`${refund.riderName ?? refund.riderUid} → ${refund.payeeName ?? refund.payeeId} · ${refund.ticketId} · ${ago(refund.requestedAt, t)}`}
              chip={adminStatusLabel(refund.status, t)}
              chipColor={adminStatusTone(refund.status)}
            />
          ))}
          detail={
            selected ? (
              <Card>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {money(selected.amount)}
                    </Typography>
                    <Chip size="small" label={adminStatusLabel(selected.status, t)} color={adminStatusTone(selected.status)} />
                    <Chip size="small" label={selected.automatic ? t.admin.system : t.admin.reportRider} variant="outlined" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {`${selected.paymentId} · ${selected.ticketId}${selected.reason ? ` · ${selected.reason}` : ""} · ${ago(selected.requestedAt, t)}`}
                  </Typography>
                  <Typography variant="body2">
                    {`${t.admin.paymentRider}: ${selected.riderName ?? selected.riderUid} · ${t.admin.paymentPayee}: ${selected.payeeName ?? selected.payeeId}`}
                  </Typography>
                  {selected.ticketStatus ? (
                    <Chip size="small" variant="outlined" label={ticketStatusLabel(selected.ticketStatus, t)} />
                  ) : null}
                  <Button size="small" variant="outlined" sx={{ alignSelf: "flex-start" }} onClick={() => openBill(selected.ticketId)}>
                    {`${t.admin.viewBill} · ${selected.ticketId}`}
                  </Button>
                  {duplicate ? <Alert severity="warning">{t.admin.duplicateRefund}</Alert> : null}
                  <Alert severity="info">{nextStep(selected)}</Alert>
                  {selected.bankName ? (
                    <Typography variant="body2">
                      {`${selected.bankName} · ${selected.accountNumber ? maskAccount(selected.accountNumber) : ""} · ${selected.holderName ?? ""}`}
                    </Typography>
                  ) : null}
                  {selected.transferRef ? (
                    <Typography variant="caption" color="text.secondary">
                      {`${t.admin.transferRef}: ${selected.transferRef}`}
                    </Typography>
                  ) : null}
                  <SettingField label={t.admin.transferRef} description={t.admin.transferRefRequired}>
                    <TextField
                      size="small"
                      fullWidth
                      value={refs[selected.id] ?? selected.transferRef ?? ""}
                      onChange={(e) =>
                        setRefs((prev) => ({ ...prev, [selected.id]: e.target.value }))
                      }
                    />
                  </SettingField>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {selected.status === "REQUESTED" ? (
                      <>
                        <Button variant="contained" disabled={busy} onClick={() => ask("approve")}>
                          {t.admin.approve}
                        </Button>
                        <Button color="error" variant="outlined" disabled={busy} onClick={() => ask("reject")}>
                          {t.admin.reject}
                        </Button>
                      </>
                    ) : null}
                    {selected.status === "APPROVED" ? (
                      <Button variant="contained" disabled={busy} onClick={() => ask("send")}>
                        {t.admin.send}
                      </Button>
                    ) : null}
                    {selected.status === "APPROVED" || selected.status === "SENT" ? (
                      <>
                        <Button variant="contained" disabled={busy} onClick={() => ask("confirm")}>
                          {t.admin.confirm}
                        </Button>
                        <Button color="error" variant="outlined" disabled={busy} onClick={() => ask("fail")}>
                          {t.admin.fail}
                        </Button>
                      </>
                    ) : null}
                  </Box>
                </CardContent>
              </Card>
            ) : null
          }
        />
      )}
      <Dialog open={confirm !== null} onClose={() => setConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t.admin.confirmTitle}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="body2">{confirmLabel}</Typography>
          {selected ? (
            <Typography variant="caption" color="text.secondary">
              {`${money(selected.amount)} · ${selected.paymentId}`}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>{t.common.cancel}</Button>
          <Button
            variant="contained"
            color={confirm === "reject" || confirm === "fail" ? "error" : "primary"}
            disabled={busy}
            onClick={() => confirm && void run(confirm)}
          >
            {t.common.save}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
