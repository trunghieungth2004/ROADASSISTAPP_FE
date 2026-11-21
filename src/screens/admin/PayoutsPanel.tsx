import { formatDateTimeDMY } from "../../utils/date";
import { useEffect, useState } from "react";
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
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import {
  adminDecidePayoutRequest,
  adminPendingPayouts,
  adminPayoutBatches,
  adminPayoutRequests,
  adminSettleCommission,
  adminSettlePayout,
  type AdminPayeeGroup,
  type AdminPayoutBatch,
  type AdminPayoutRequest,
} from "../../api/admin";
import { useStrings } from "../../context/LanguageContext";
import StorageImage from "../../components/StorageImage";
import { uploadImages } from "../../storage/uploads";
import { adminStatusLabel, adminStatusTone } from "./adminLabels";
import AdminListItem from "./AdminListItem";
import MasterDetail from "./MasterDetail";
import PanelHeader from "./PanelHeader";
import { useAdminQueue } from "./AdminQueueContext";
import { ago, maskAccount, money } from "./format";

type Selection =
  | { kind: "request"; id: string }
  | { kind: "group"; id: string }
  | { kind: "batch"; id: string };

type Confirm =
  | { kind: "approve" | "reject"; request: AdminPayoutRequest }
  | { kind: "settle" | "commission"; group: AdminPayeeGroup }
  | null;

export default function PayoutsPanel({ token }: { token: string | null }) {
  const { t } = useStrings();
  const { refresh } = useAdminQueue();
  const [groups, setGroups] = useState<AdminPayeeGroup[]>([]);
  const [requests, setRequests] = useState<AdminPayoutRequest[]>([]);
  const [batches, setBatches] = useState<AdminPayoutBatch[]>([]);
  const [requestStatus, setRequestStatus] = useState("ALL");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);

  const needsProof = confirm?.kind === "approve" || confirm?.kind === "settle";

  async function confirmAction(): Promise<void> {
    const current = confirm;
    if (!current || !token || busy) return;
    if (needsProof && proofFile === null) {
      setError(t.admin.payoutProofRequired);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let proofUrl: string | undefined;
      if (needsProof && proofFile !== null) {
        const paths = await uploadImages([proofFile], "payouts/proof");
        proofUrl = paths[0];
      }
      if (current.kind === "approve") {
        await adminDecidePayoutRequest(token, current.request.id, true, undefined, proofUrl);
      } else if (current.kind === "reject") {
        await adminDecidePayoutRequest(token, current.request.id, false);
      } else if (current.kind === "settle") {
        await adminSettlePayout(token, current.group.payeeId, undefined, proofUrl);
      } else if (current.kind === "commission") {
        await adminSettleCommission(token, current.group.payeeId);
      }
      setProofFile(null);
      setConfirm(null);
      await load(token);
      refresh();
      setNotice(t.admin.saved);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function load(key: string) {
    setError(null);
    try {
      const [nextGroups, nextRequests, nextBatches] = await Promise.all([
        adminPendingPayouts(key),
        adminPayoutRequests(key),
        adminPayoutBatches(key, 20),
      ]);
      setGroups(nextGroups);
      setRequests(nextRequests);
      setBatches(nextBatches);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  useEffect(() => {
    if (token) void load(token);
  }, [token]);

  const selectedRequest =
    selection?.kind === "request"
      ? requests.find((request) => request.id === selection.id) ?? null
      : null;
  const selectedGroup =
    selection?.kind === "group"
      ? groups.find((group) => group.payeeId === selection.id) ?? null
      : null;
  const selectedBatch =
    selection?.kind === "batch"
      ? batches.find((batch) => batch.id === selection.id) ?? null
      : null;
  const visibleRequests =
    requestStatus === "ALL"
      ? requests
      : requests.filter((request) => request.status === requestStatus);

  return (
    <Box>
      <PanelHeader
        title={t.admin.payouts}
        onRefresh={() => token && void load(token)}
        refreshLabel={t.admin.refresh}
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert> : null}
      <MasterDetail
        empty={t.admin.selectPrompt}
        list={
          <>
            <Typography variant="subtitle2">{t.admin.payoutRequests}</Typography>
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
              {["ALL", "PENDING", "PAID", "REJECTED"].map((value) => (
                <Chip
                  key={value}
                  size="small"
                  label={value === "ALL" ? t.admin.all : adminStatusLabel(value, t)}
                  color={requestStatus === value ? "primary" : "default"}
                  variant={requestStatus === value ? "filled" : "outlined"}
                  onClick={() => setRequestStatus(value)}
                />
              ))}
            </Box>
            {visibleRequests.length === 0 ? (
              <Alert severity="info">{t.admin.noPayouts}</Alert>
            ) : (
              visibleRequests.map((request) => (
                <AdminListItem
                  key={request.id}
                  selected={selection?.kind === "request" && selection.id === request.id}
                  onClick={() => setSelection({ kind: "request", id: request.id })}
                  title={request.payeeName ?? request.payeeId}
                  subtitle={`${money(request.amount)} · ${ago(request.requestedAt, t)}`}
                  chip={adminStatusLabel(request.status, t)}
                  chipColor={adminStatusTone(request.status)}
                />
              ))
            )}
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              {t.admin.pendingPayouts}
            </Typography>
            {groups.length === 0 ? (
              <Alert severity="info">{t.admin.noPayouts}</Alert>
            ) : (
              groups.map((group) => (
                <AdminListItem
                  key={group.payeeId}
                  selected={selection?.kind === "group" && selection.id === group.payeeId}
                  onClick={() => setSelection({ kind: "group", id: group.payeeId })}
                  title={group.payeeName ?? group.payeeId}
                  subtitle={`${t.admin.net}: ${money(group.net)} · ${t.admin.commissionOwed}: ${money(group.commissionOwed)}`}
                  chip={String(group.itemCount)}
                />
              ))
            )}
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              {t.admin.batches}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t.admin.batchesLede}
            </Typography>
            {batches.length === 0 ? (
              <Alert severity="info">{t.admin.noBatches}</Alert>
            ) : (
              batches.slice(0, 10).map((batch) => (
                <AdminListItem
                  key={batch.id}
                  selected={selection?.kind === "batch" && selection.id === batch.id}
                  onClick={() => setSelection({ kind: "batch", id: batch.id })}
                  title={batch.payeeName ?? batch.payeeId}
                  subtitle={`${t.admin.batchRef}: ${batch.payoutRef || batch.id} · ${ago(batch.batchedAt, t)}`}
                  chip={adminStatusLabel(batch.status, t)}
                  chipColor={adminStatusTone(batch.status)}
                />
              ))
            )}
          </>
        }
        detail={
          selectedRequest ? (
            <Card>
              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {selectedRequest.payeeName ?? selectedRequest.payeeId}
                  </Typography>
                  <Chip size="small" label={adminStatusLabel(selectedRequest.status, t)} color={adminStatusTone(selectedRequest.status)} />
                </Box>
                <Typography variant="body2">
                  {`${money(selectedRequest.amount)} · ${ago(selectedRequest.requestedAt, t)}`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {`${selectedRequest.bankName} · ${maskAccount(selectedRequest.accountNumber)} · ${selectedRequest.holderName}`}
                </Typography>
                {selectedRequest.status === "PENDING" ? (
                  <>
                    <Alert severity="info">{t.admin.payoutNextPending}</Alert>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={busy}
                        onClick={() => setConfirm({ kind: "approve", request: selectedRequest })}
                      >
                        {t.admin.approve}
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        disabled={busy}
                        onClick={() => setConfirm({ kind: "reject", request: selectedRequest })}
                      >
                        {t.admin.reject}
                      </Button>
                    </Box>
                  </>
                ) : null}
                {selectedRequest.decisionNote ? (
                  <Typography variant="caption" color="text.secondary">
                    {selectedRequest.decisionNote}
                  </Typography>
                ) : null}
                {selectedRequest.proofUrl ? (
                  <Box>
                    <Typography variant="subtitle2">{t.admin.payoutProof}</Typography>
                    <StorageImage
                      path={selectedRequest.proofUrl}
                      alt={t.admin.payoutProof}
                      sx={{ width: "100%", maxHeight: 260, borderRadius: 1, mt: 1 }}
                    />
                  </Box>
                ) : null}
              </CardContent>
            </Card>
          ) : selectedGroup ? (
            <Card>
              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Typography variant="h6">{selectedGroup.payeeName ?? selectedGroup.payeeId}</Typography>
                <Typography variant="body2">
                  {`${t.admin.gross}: ${money(selectedGroup.gross)} · ${t.admin.platformRevenue}: ${money(selectedGroup.commission)}`}
                </Typography>
                <Typography variant="body2">
                  {`${t.admin.net}: ${money(selectedGroup.net)} · ${t.admin.commissionOwed}: ${money(selectedGroup.commissionOwed)}`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedGroup.account ?
                    `${t.admin.payoutAccount}: ${selectedGroup.account.bankName} · ${maskAccount(selectedGroup.account.accountNumber)} · ${selectedGroup.account.holderName}` :
                    `${t.admin.payoutAccount}: ${t.admin.payoutAccountMissing}`}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {selectedGroup.itemCount > 0 ? (
                    <Button
                      size="small"
                      variant="contained"
                      disabled={busy}
                      onClick={() => setConfirm({ kind: "settle", group: selectedGroup })}
                    >
                      {t.admin.settleAll}
                    </Button>
                  ) : null}
                  {selectedGroup.commissionOwed > 0 ? (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={busy}
                      onClick={() => setConfirm({ kind: "commission", group: selectedGroup })}
                    >
                      {t.admin.settleCommission}
                    </Button>
                  ) : null}
                </Box>
              </CardContent>
            </Card>
          ) : selectedBatch ? (
            <Card>
              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {selectedBatch.payeeName ?? selectedBatch.payeeId}
                  </Typography>
                  <Chip size="small" label={adminStatusLabel(selectedBatch.status, t)} color={adminStatusTone(selectedBatch.status)} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {`${t.admin.batchRef}: ${selectedBatch.payoutRef || selectedBatch.id} · ${formatDateTimeDMY(selectedBatch.batchedAt)}`}
                </Typography>
                <Typography variant="body2">
                  {`${t.admin.gross}: ${money(selectedBatch.gross)} · ${t.admin.platformRevenue}: ${money(selectedBatch.commission)}`}
                </Typography>
                <Typography variant="body2">
                  {`${t.admin.batchNet}: ${money(selectedBatch.netPayout ?? selectedBatch.net)} · ${selectedBatch.itemCount} ${t.admin.batchItems}`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedBatch.payeeAccount ?
                    `${t.admin.payoutAccount}: ${selectedBatch.payeeAccount.bankName} · ${maskAccount(selectedBatch.payeeAccount.accountNumber)} · ${selectedBatch.payeeAccount.holderName}` :
                    `${t.admin.payoutAccount}: ${t.admin.payoutAccountMissing}`}
                </Typography>
                {selectedBatch.note ? (
                  <Typography variant="caption" color="text.secondary">
                    {selectedBatch.note}
                  </Typography>
                ) : null}
                {selectedBatch.proofUrl ? (
                  <Box>
                    <Typography variant="subtitle2">{t.admin.payoutProof}</Typography>
                    <StorageImage
                      path={selectedBatch.proofUrl}
                      alt={t.admin.payoutProof}
                      sx={{ width: "100%", maxHeight: 260, borderRadius: 1, mt: 1 }}
                    />
                  </Box>
                ) : null}
              </CardContent>
            </Card>
          ) : null
        }
      />
      <Dialog
        open={confirm !== null}
        onClose={() => {
          setConfirm(null);
          setProofFile(null);
          setError(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t.admin.confirmTitle}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Typography variant="body2">
            {confirm?.kind === "approve"
              ? t.admin.confirmPayoutApprove
              : confirm?.kind === "reject"
                ? t.admin.confirmPayoutReject
                : confirm?.kind === "settle"
                  ? t.admin.confirmSettlePayout
                  : t.admin.confirmSettleCommission}
          </Typography>
          {confirm && "request" in confirm ? (
            <Typography variant="caption" color="text.secondary">
              {`${confirm.request.payeeName ?? confirm.request.payeeId} · ${money(confirm.request.amount)}`}
            </Typography>
          ) : null}
          {confirm && "group" in confirm ? (
            <Typography variant="caption" color="text.secondary">
              {`${confirm.group.payeeName ?? confirm.group.payeeId} · ${t.admin.net}: ${money(confirm.group.net)}`}
            </Typography>
          ) : null}
          {needsProof ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
              <Typography variant="subtitle2">{t.admin.payoutProof}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t.admin.payoutProofHint}
              </Typography>
              <Button variant="outlined" component="label">
                {t.admin.payoutProofUpload}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    setProofFile(event.target.files?.[0] ?? null);
                    setError(null);
                  }}
                />
              </Button>
              {proofFile ? (
                <Typography variant="caption" color="text.secondary">{proofFile.name}</Typography>
              ) : null}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setConfirm(null);
              setProofFile(null);
              setError(null);
            }}
            disabled={busy}
          >
            {t.common.cancel}
          </Button>
          <Button
            variant="contained"
            color={confirm?.kind === "reject" ? "error" : "primary"}
            disabled={busy}
            onClick={() => void confirmAction()}
          >
            {t.common.save}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
