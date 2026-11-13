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
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import {
  fetchPendingProviders,
  reviewProvider,
  type Provider,
} from "../../api/providers";
import { useStrings } from "../../context/LanguageContext";
import { humanizeEnum } from "./adminLabels";
import AdminListItem from "./AdminListItem";
import MasterDetail from "./MasterDetail";
import EmptyState from "./EmptyState";
import PanelHeader from "./PanelHeader";
import { useAdminQueue } from "./AdminQueueContext";

export default function RequestsPanel({ token }: { token: string | null }) {
  const { t } = useStrings();
  const { refresh } = useAdminQueue();
  const [requests, setRequests] = useState<Provider[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<null | boolean>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(key: string) {
    setError(null);
    try {
      setRequests(await fetchPendingProviders(key));
    } catch (err) {
      setError(toMessage(err));
    }
  }

  useEffect(() => {
    if (token) void load(token);
  }, [token]);

  const selected = requests.find((request) => request.id === selectedId) ?? null;

  function select(request: Provider) {
    setSelectedId(request.id);
    setNote("");
    setNotice(null);
  }

  function askReview(approve: boolean) {
    if (!approve && note.trim() === "") {
      setError(t.admin.noteRequired);
      return;
    }
    setError(null);
    setConfirm(approve);
  }

  async function onReview(approve: boolean) {
    if (!token || !selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      await reviewProvider(
        {
          providerId: selected.id,
          approve,
          ...(note.trim() ? { reviewNote: note.trim() } : {}),
        },
        token,
      );
      setConfirm(null);
      setSelectedId(null);
      await load(token);
      refresh();
      setNotice(t.admin.saved);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box>
      <PanelHeader
        title={t.admin.requests}
        onRefresh={() => token && void load(token)}
        refreshLabel={t.admin.refresh}
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert> : null}
      {requests.length === 0 ? (
        <EmptyState message={t.admin.noRequests} />
      ) : (
        <MasterDetail
          empty={t.admin.selectPrompt}
          list={requests.map((request) => (
            <AdminListItem
              key={request.id}
              selected={request.id === selectedId}
              onClick={() => select(request)}
              title={`${request.name}${request.kind === "TOW" && request.plate ? ` · ${request.plate}` : ""}`}
              subtitle={`${t.admin.applicant}: ${request.applicantName || request.applicantEmail || request.operatorUid}`}
              chip={humanizeEnum(request.kind)}
            />
          ))}
          detail={
            selected ? (
              <Card>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>{selected.name}</Typography>
                    <Chip size="small" label={humanizeEnum(selected.kind)} />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {t.admin.applicant}: {selected.applicantName || selected.applicantEmail || selected.operatorUid}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                    {selected.ratingAvg !== undefined ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`${t.admin.rating}: ${selected.ratingAvg.toFixed(1)} (${selected.ratingCount ?? 0})`}
                      />
                    ) : null}
                    {selected.vehicleType ? <Chip size="small" variant="outlined" label={`${selected.vehicleType}${selected.vehicleWidth ? ` · ${selected.vehicleWidth} m` : ""}`} /> : null}
                    {selected.plate ? <Chip size="small" variant="outlined" label={selected.plate} /> : null}
                    {selected.openHours ? <Chip size="small" variant="outlined" label={selected.openHours} /> : null}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {`${t.admin.location}: ${selected.label ?? `${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}`}`}
                  </Typography>
                  {typeof selected.openReportCount === "number" && selected.openReportCount > 0 ? (
                    <Alert severity="warning">{`${selected.openReportCount} ${t.admin.openReports}`}</Alert>
                  ) : null}
                  {Array.isArray(selected.services) && selected.services.length > 0 ? (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{t.admin.servicesEvidence}</Typography>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                        {selected.services.map((service) => (
                          <Box key={service.code} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography variant="body2" sx={{ flexGrow: 1 }}>
                              {service.name}
                              {service.warrantyDays !== undefined ? ` · ${t.bills.warranty} ${service.warrantyDays}d` : ""}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {service.quoteRequired ? t.provider.quoteRequired : `${service.displayPrice.toLocaleString()} ₫`}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                      <Divider sx={{ mt: 1 }} />
                    </Box>
                  ) : null}
                  <TextField
                    size="small"
                    label={t.admin.reviewNote}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    helperText={t.admin.denyNote}
                    multiline
                    minRows={2}
                    fullWidth
                  />
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button variant="contained" disabled={busy} onClick={() => askReview(true)}>
                      {t.admin.approve}
                    </Button>
                    <Button variant="outlined" color="error" disabled={busy} onClick={() => askReview(false)}>
                      {t.admin.deny}
                    </Button>
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
          <Typography variant="body2">
            {confirm ? t.admin.approve : t.admin.deny}: {selected?.name}
          </Typography>
          {note.trim() ? (
            <Typography variant="caption" color="text.secondary">{note}</Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>{t.common.cancel}</Button>
          <Button
            variant="contained"
            color={confirm ? "primary" : "error"}
            disabled={busy}
            onClick={() => void onReview(confirm === true)}
          >
            {confirm ? t.admin.approve : t.admin.deny}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
