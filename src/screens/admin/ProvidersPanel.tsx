import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import {
  dismissReport,
  fetchAdminProviders,
  fetchOpenReports,
  reviewProvider,
  suspendProvider,
  type AdminProviderList,
  type AdminProviderListFilters,
  type Provider,
  type ProviderReport,
} from "../../api/providers";
import { useStrings } from "../../context/LanguageContext";
import DateField from "../../components/DateField";
import { formatDateTimeDMY } from "../../utils/date";
import { humanizeEnum } from "./adminLabels";
import AdminListItem from "./AdminListItem";
import MasterDetail from "./MasterDetail";
import EmptyState from "./EmptyState";
import PanelHeader from "./PanelHeader";
import { useAdminQueue } from "./AdminQueueContext";

export default function ProvidersPanel({ token }: { token: string | null }) {
  const { t } = useStrings();
  const { refresh } = useAdminQueue();
  const [searchParams] = useSearchParams();
  const targetProviderId = searchParams.get("providerId");
  const [data, setData] = useState<AdminProviderList | null>(null);
  const [reports, setReports] = useState<ProviderReport[]>([]);
  const [status, setStatus] = useState(targetProviderId ? "" : "PENDING");
  const [kind, setKind] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<null | boolean>(null);
  const [suspendTarget, setSuspendTarget] = useState<ProviderReport | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function filters(overrides: Partial<AdminProviderListFilters> = {}): AdminProviderListFilters {
    return {
      status: status || undefined,
      kind: kind || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      ...overrides,
    };
  }

  async function load(key: string, query: AdminProviderListFilters) {
    setError(null);
    try {
      setData(await fetchAdminProviders(key, query));
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function loadReports(key: string) {
    try {
      setReports(await fetchOpenReports(key));
    } catch (err) {
      setError(toMessage(err));
    }
  }

  useEffect(() => {
    if (!token) return;
    void load(token, targetProviderId ? {} : filters());
    void loadReports(token);
  }, [token]);

  useEffect(() => {
    if (!token || !targetProviderId) return;
    setStatus("");
    setKind("");
    setStartDate("");
    setEndDate("");
    void load(token, {});
  }, [token, targetProviderId]);

  useEffect(() => {
    if (!targetProviderId || !data) return;
    const target = data.items.find((item) => item.id === targetProviderId);
    if (target) select(target);
  }, [data, targetProviderId]);

  const requests = data?.items ?? [];
  const selected = requests.find((request) => request.id === selectedId) ?? null;

  function select(request: Provider) {
    setSelectedId(request.id);
    setNote(request.reviewNote ?? "");
    setNotice(null);
  }

  function applyFilters() {
    if (!token) return;
    setSelectedId(null);
    void load(token, filters());
  }

  function clearFilters() {
    if (!token) return;
    setStatus("");
    setKind("");
    setStartDate("");
    setEndDate("");
    setSelectedId(null);
    void load(token, {});
  }

  async function onDismissReport(report: ProviderReport): Promise<void> {
    if (!token || reportBusy) return;
    setReportBusy(true);
    setError(null);
    try {
      await dismissReport(report.id, token);
      await loadReports(token);
      await load(token, filters());
      refresh();
      setNotice(t.admin.saved);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setReportBusy(false);
    }
  }

  function askSuspend(report: ProviderReport) {
    setSuspendTarget(report);
    setSuspendReason(report.note ?? humanizeEnum(report.reason));
  }

  async function onSuspendReport(): Promise<void> {
    if (!token || !suspendTarget || reportBusy) return;
    const reason = suspendReason.trim();
    if (reason === "") {
      setError(t.admin.reason);
      return;
    }
    setReportBusy(true);
    setError(null);
    try {
      await suspendProvider({
        providerId: suspendTarget.providerId,
        reason,
        reportId: suspendTarget.id,
      }, token);
      setSuspendTarget(null);
      setSuspendReason("");
      await loadReports(token);
      await load(token, filters());
      refresh();
      setNotice(t.admin.saved);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setReportBusy(false);
    }
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
      await load(token, filters());
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
        title={t.admin.providerApprovals}
        onRefresh={() => {
          if (!token) return;
          void load(token, filters());
          void loadReports(token);
        }}
        refreshLabel={t.admin.refresh}
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert> : null}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            size="small"
            select
            label={t.admin.status}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">{t.admin.allStatuses}</MenuItem>
            <MenuItem value="PENDING">{t.admin.statusPendingReview}</MenuItem>
            <MenuItem value="ACTIVE">{t.admin.active}</MenuItem>
            <MenuItem value="DENIED">{t.admin.deny}</MenuItem>
          </TextField>
          <TextField
            size="small"
            select
            label={t.admin.filterKind}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">{t.admin.allKinds}</MenuItem>
            <MenuItem value="SHOP">{humanizeEnum("SHOP")}</MenuItem>
            <MenuItem value="TOW">{humanizeEnum("TOW")}</MenuItem>
            <MenuItem value="MOBILE_SHOP">{humanizeEnum("MOBILE_SHOP")}</MenuItem>
          </TextField>
          <DateField
            label={t.admin.startDate}
            value={startDate}
            onChange={setStartDate}
          />
          <DateField
            label={t.admin.endDate}
            value={endDate}
            onChange={setEndDate}
          />
          <Button size="small" variant="contained" onClick={applyFilters}>
            {t.admin.apply}
          </Button>
          <Button size="small" onClick={clearFilters}>
            {t.admin.clearFilters}
          </Button>
        </CardContent>
      </Card>
      {data ? (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
          <Chip size="small" label={`${t.admin.approvalPending}: ${data.counts.PENDING ?? 0}`} color={(data.counts.PENDING ?? 0) > 0 ? "warning" : "default"} />
          <Chip size="small" label={`${t.admin.approved}: ${data.counts.ACTIVE ?? 0}`} />
          <Chip size="small" label={`${t.admin.denied}: ${data.counts.DENIED ?? 0}`} />
          <Chip size="small" variant="outlined" label={`${t.admin.all}: ${data.counts.ALL ?? 0}`} />
          <Chip size="small" color={reports.length > 0 ? "error" : "default"} label={`${t.admin.reports}: ${reports.length}`} />
        </Box>
      ) : null}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="subtitle2">{`${t.admin.reports} (${reports.length})`}</Typography>
          {reports.length === 0 ? (
            <Typography variant="body2" color="text.secondary">{t.admin.noReports}</Typography>
          ) : reports.map((report) => (
            <Box key={report.id} sx={{ display: "flex", alignItems: "flex-start", gap: 1, flexWrap: "wrap" }}>
              <Box sx={{ flexGrow: 1, minWidth: 220 }}>
                <Typography variant="body2">
                  {report.providerName ?? report.providerId}
                  {` · ${humanizeEnum(report.reason)}`}
                  {report.providerSuspended ? ` · ${t.admin.suspendedNote}` : ""}
                </Typography>
                {report.note ? (
                  <Typography variant="caption" color="text.secondary">{report.note}</Typography>
                ) : null}
                <Typography variant="caption" color="text.secondary">
                  {`${t.admin.reporter}: ${report.reportedBy}${report.createdAt ? ` · ${formatDateTimeDMY(report.createdAt)}` : ""}`}
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                disabled={reportBusy || report.providerSuspended}
                onClick={() => askSuspend(report)}
              >
                {t.admin.suspend}
              </Button>
              <Button
                size="small"
                disabled={reportBusy}
                onClick={() => void onDismissReport(report)}
              >
                {t.admin.dismiss}
              </Button>
            </Box>
          ))}
        </CardContent>
      </Card>
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
              chip={`${humanizeEnum(request.kind)} · ${humanizeEnum(request.status)}`}
            />
          ))}
          detail={
            selected ? (
              <Card>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>{selected.name}</Typography>
                    <Chip size="small" label={humanizeEnum(selected.kind)} />
                    <Chip
                      size="small"
                      color={selected.status === "PENDING" ? "warning" : selected.status === "ACTIVE" ? "success" : "default"}
                      label={humanizeEnum(selected.status)}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {t.admin.applicant}: {selected.applicantName || selected.applicantEmail || selected.operatorUid}
                  </Typography>
                  {selected.applicantEmail || selected.applicantPhone ? (
                    <Typography variant="body2" color="text.secondary">
                      {[selected.applicantEmail, selected.applicantPhone].filter(Boolean).join(" · ")}
                    </Typography>
                  ) : null}
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
                    {selected.licenseNumber ? <Chip size="small" variant="outlined" label={`${t.provider.license}: ${selected.licenseNumber}`} /> : null}
                    {selected.openHours ? <Chip size="small" variant="outlined" label={selected.openHours} /> : null}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {`${t.admin.location}: ${selected.label ?? `${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}`}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {`${t.admin.requested}: ${selected.requestedAt ? formatDateTimeDMY(selected.requestedAt) : "—"}`}
                  </Typography>
                  {selected.decidedAt ? (
                    <Typography variant="body2" color="text.secondary">
                      {`${t.admin.decided}: ${formatDateTimeDMY(selected.decidedAt)}${selected.reviewedBy ? ` · ${selected.reviewedBy}` : ""}`}
                    </Typography>
                  ) : null}
                  {selected.reviewNote ? (
                    <Typography variant="body2" color="text.secondary">
                      {`${t.admin.reviewNote}: ${selected.reviewNote}`}
                    </Typography>
                  ) : null}
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
                  {selected.status === "PENDING" ? (
                    <>
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
                    </>
                  ) : null}
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
      <Dialog open={suspendTarget !== null} onClose={() => setSuspendTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t.admin.suspend}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="body2">
            {suspendTarget?.providerName ?? suspendTarget?.providerId}
          </Typography>
          <TextField
            size="small"
            label={t.admin.reason}
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendTarget(null)}>{t.common.cancel}</Button>
          <Button
            variant="contained"
            color="error"
            disabled={reportBusy || suspendReason.trim() === ""}
            onClick={() => void onSuspendReport()}
          >
            {t.admin.suspend}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
