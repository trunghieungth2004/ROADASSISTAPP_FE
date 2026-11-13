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
import { toMessage } from "../../api/client";
import {
  adminResolveWarranty,
  adminWarrantyClaims,
  type AdminWarrantyClaim,
} from "../../api/admin";
import { useStrings } from "../../context/LanguageContext";
import StorageImage from "../../components/StorageImage";
import PhotoLightbox, { type PhotoPreview } from "../../components/PhotoLightbox";
import AdminListItem from "./AdminListItem";
import EmptyState from "./EmptyState";
import MasterDetail from "./MasterDetail";
import PanelHeader from "./PanelHeader";
import SettingField from "./SettingField";
import { ago, money } from "./format";
import { useAdminBill } from "./AdminBillContext";
import { adminStatusLabel, adminStatusTone, disputeOutcomeLabel } from "./adminLabels";

const STATUSES = ["OPEN", "DISPUTED", "DECLINED", "REBOOKED", "COMPLETED", "RESOLVED"];

export default function WarrantyAdminPanel({ token }: { token: string | null }) {
  const { t } = useStrings();
  const { openBill } = useAdminBill();
  const [status, setStatus] = useState("");
  const [claims, setClaims] = useState<AdminWarrantyClaim[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, { outcome: string; refund: string; note: string }>>({});
  const [busy, setBusy] = useState(false);
  const [confirmClaim, setConfirmClaim] = useState<AdminWarrantyClaim | null>(null);
  const [preview, setPreview] = useState<PhotoPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setClaims(await adminWarrantyClaims(token, status || undefined));
      setError(null);
    } catch (err) {
      setError(toMessage(err));
    }
  }, [token, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = claims.find((claim) => claim.id === selectedId) ?? null;

  async function resolve(claim: AdminWarrantyClaim) {
    if (!token || busy) return;
    const row = draft[claim.id] ?? { outcome: "SHOP", refund: "", note: "" };
    if (row.note.trim() === "") {
      setError(t.admin.warrantyNote);
      return;
    }
    if (row.outcome === "PARTIAL" && row.refund.trim() === "") {
      setError(t.admin.warrantyRefund);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminResolveWarranty(token, {
        claimId: claim.id,
        outcome: row.outcome as "SHOP" | "RIDER" | "PARTIAL",
        ...(row.refund.trim() !== "" ? { refundAmount: Number(row.refund) } : {}),
        note: row.note.trim(),
      });
      setConfirmClaim(null);
      setNotice(t.admin.warrantyResolved);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const row = selected
    ? draft[selected.id] ?? { outcome: "SHOP", refund: "", note: "" }
    : { outcome: "SHOP", refund: "", note: "" };
  const open = selected !== null &&
    ["OPEN", "DISPUTED", "DECLINED", "REBOOKED"].includes(selected.status);

  return (
    <Box>
      <PanelHeader
        title={t.admin.warranty}
        onRefresh={() => void load()}
        refreshLabel={t.admin.refresh}
        action={
          <TextField
            select
            size="small"
            label={t.admin.status}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">{t.admin.all}</MenuItem>
            {STATUSES.map((value) => <MenuItem key={value} value={value}>{adminStatusLabel(value, t)}</MenuItem>)}
          </TextField>
        }
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert> : null}
      {claims.length === 0 ? (
        <EmptyState message={t.admin.warrantyNone} />
      ) : (
        <MasterDetail
          empty={t.admin.selectPrompt}
          list={claims.map((claim) => (
            <AdminListItem
              key={claim.id}
              selected={claim.id === selectedId}
              onClick={() => {
                setSelectedId(claim.id);
                setNotice(null);
              }}
              title={claim.serviceName}
              subtitle={`${claim.providerName ?? claim.providerId} · ${claim.ticketId} · ${money(claim.lineAmount)} · ${ago(claim.createdAt, t)}`}
              chip={adminStatusLabel(claim.status, t)}
              chipColor={adminStatusTone(claim.status)}
            />
          ))}
          detail={
            selected ? (
              <Card>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {selected.serviceName}
                    </Typography>
                    <Chip size="small" label={adminStatusLabel(selected.status, t)} color={adminStatusTone(selected.status)} />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {`${selected.providerName ?? selected.providerId} · ${selected.ticketId} · ${money(selected.lineAmount)} · ${ago(selected.createdAt, t)}`}
                  </Typography>
                  <Typography variant="body2">{selected.reason}</Typography>
                  <Button size="small" variant="outlined" sx={{ alignSelf: "flex-start" }} onClick={() => openBill(selected.ticketId)}>
                    {`${t.admin.viewBill} · ${selected.ticketId}`}
                  </Button>
                  {Array.isArray(selected.photoUrls) && selected.photoUrls.length > 0 ? (
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {selected.photoUrls.map((url, index) => (
                        <Box
                          key={url}
                          sx={{ width: 84, height: 84, borderRadius: 2, overflow: "hidden", border: 1, borderColor: "divider" }}
                        >
                          <StorageImage
                            path={url}
                            sx={{ width: "100%", height: "100%" }}
                            onClick={() => setPreview({ photos: selected.photoUrls ?? [], index })}
                          />
                        </Box>
                      ))}
                    </Box>
                  ) : null}
                  {selected.declineReasonCode ? (
                    <Typography variant="caption" color="text.secondary">
                      {`${t.admin.warrantyDeclineReason}: ${selected.declineReasonCode}`}
                    </Typography>
                  ) : null}
                  {selected.shopResponse ? (
                    <Typography variant="caption" color="text.secondary">
                      {`${t.admin.warrantyShopResponse}: ${selected.shopResponse}`}
                    </Typography>
                  ) : null}
                  {selected.disputeNote ? (
                    <Typography variant="caption" color="text.secondary">
                      {`${t.admin.warrantyDisputeNote}: ${selected.disputeNote}`}
                    </Typography>
                  ) : null}
                  {selected.resolutionNote ? (
                    <Typography variant="caption" color="text.secondary">
                      {`${t.admin.warrantyResolutionNote}: ${selected.resolutionNote}`}
                    </Typography>
                  ) : null}
                  {selected.outcome ? (
                    <Typography variant="caption" color="text.secondary">
                      {`${t.admin.outcome}: ${disputeOutcomeLabel(selected.outcome, t)}${selected.refundAmount ? ` · ${money(selected.refundAmount)}` : ""}`}
                    </Typography>
                  ) : null}
                  {open ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <SettingField label={t.admin.outcome}>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={row.outcome}
                          onChange={(event) => setDraft((prev) => ({ ...prev, [selected.id]: { ...row, outcome: event.target.value } }))}
                        >
                          <MenuItem value="SHOP">{t.admin.outcomeShop}</MenuItem>
                          <MenuItem value="RIDER">{t.admin.outcomeRider}</MenuItem>
                          <MenuItem value="PARTIAL">{t.admin.outcomePartial}</MenuItem>
                        </TextField>
                      </SettingField>
                      {row.outcome === "PARTIAL" ? (
                        <SettingField label={t.admin.warrantyRefund}>
                          <TextField
                            size="small"
                            type="number"
                            fullWidth
                            value={row.refund}
                            onChange={(event) => setDraft((prev) => ({ ...prev, [selected.id]: { ...row, refund: event.target.value } }))}
                          />
                        </SettingField>
                      ) : null}
                      <SettingField label={t.admin.warrantyNote}>
                        <TextField
                          size="small"
                          fullWidth
                          value={row.note}
                          onChange={(event) => setDraft((prev) => ({ ...prev, [selected.id]: { ...row, note: event.target.value } }))}
                          multiline
                          minRows={2}
                        />
                      </SettingField>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={busy}
                        sx={{ alignSelf: "flex-start" }}
                        onClick={() => {
                          if (row.note.trim() === "") {
                            setError(t.admin.warrantyNote);
                            return;
                          }
                          if (row.outcome === "PARTIAL" && row.refund.trim() === "") {
                            setError(t.admin.warrantyRefund);
                            return;
                          }
                          setError(null);
                          setConfirmClaim(selected);
                        }}
                      >
                        {t.admin.warrantyResolve}
                      </Button>
                    </Box>
                  ) : null}
                </CardContent>
              </Card>
            ) : null
          }
        />
      )}
      <PhotoLightbox
        preview={preview}
        onClose={() => setPreview(null)}
        onChange={(index) => setPreview((prev) => (prev ? { ...prev, index } : prev))}
      />
      <Dialog open={confirmClaim !== null} onClose={() => setConfirmClaim(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t.admin.confirmTitle}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="body2">{t.admin.confirmWarranty}</Typography>
          {confirmClaim ? (
            <Typography variant="caption" color="text.secondary">
              {`${confirmClaim.serviceName} · ${confirmClaim.providerName ?? confirmClaim.providerId}`}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClaim(null)}>{t.common.cancel}</Button>
          <Button
            variant="contained"
            disabled={busy}
            onClick={() => confirmClaim && void resolve(confirmClaim)}
          >
            {t.admin.warrantyResolve}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
