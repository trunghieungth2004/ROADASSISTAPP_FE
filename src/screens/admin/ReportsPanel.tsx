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
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import {
  adminDecideReport,
  adminReports,
  type AdminReport,
} from "../../api/admin";
import { useStrings } from "../../context/LanguageContext";
import StorageImage from "../../components/StorageImage";
import PhotoLightbox, { type PhotoPreview } from "../../components/PhotoLightbox";
import AdminListItem from "./AdminListItem";
import TicketTimeline from "./TicketTimeline";
import ReportCaseDialog from "./ReportCaseDialog";
import { ticketStatusLabel } from "./ticketStatus";
import EmptyState from "./EmptyState";
import MasterDetail from "./MasterDetail";
import PanelHeader from "./PanelHeader";
import SettingField from "./SettingField";
import { useAdminQueue } from "./AdminQueueContext";
import { useAdminBill } from "./AdminBillContext";
import { adminStatusLabel, adminStatusTone, humanizeEnum, reportActionLabel } from "./adminLabels";
import { ago } from "./format";

const ACTIONS: Record<string, string[]> = {
  PROVIDER: ["NONE", "WARN", "RESTRICT", "SUSPEND"],
  RIDER: ["NONE", "WARN", "RESTRICT", "BLOCK"],
};

export default function ReportsPanel({ token }: { token: string | null }) {
  const { t } = useStrings();
  const { openBill } = useAdminBill();
  const { refresh } = useAdminQueue();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [targetKind, setTargetKind] = useState("ALL");
  const [status, setStatus] = useState("OPEN");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [caseReport, setCaseReport] = useState<AdminReport | null>(null);
  const [action, setAction] = useState("NONE");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [preview, setPreview] = useState<PhotoPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(key: string) {
    setError(null);
    try {
      const result = await adminReports(
        key,
        targetKind === "ALL" ? undefined : targetKind,
        status === "ALL" ? undefined : status,
      );
      setReports(result.reports);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  useEffect(() => {
    if (token) void load(token);
  }, [token, targetKind, status]);

  const selected = reports.find((report) => report.id === selectedId) ?? null;

  function select(report: AdminReport): void {
    setSelectedId(report.id);
    setAction("NONE");
    setNote("");
    setNotice(null);
  }

  async function decide(report: AdminReport): Promise<void> {
    if (!token || busy) return;
    if (action !== "NONE" && note.trim() === "") {
      setError(t.admin.noteRequired);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminDecideReport(token, {
        reportId: report.id,
        action,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setConfirm(false);
      setSelectedId(null);
      await load(token);
      refresh();
      setNotice(t.admin.reportDecided);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box>
      <PanelHeader
        title={t.admin.reports}
        onRefresh={() => token && void load(token)}
        refreshLabel={t.admin.refresh}
        action={
          <TextField
            select
            size="small"
            label={t.admin.status}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="OPEN">OPEN</MenuItem>
            <MenuItem value="RESOLVED">RESOLVED</MenuItem>
            <MenuItem value="DISMISSED">DISMISSED</MenuItem>
            <MenuItem value="ALL">{t.admin.allStatuses}</MenuItem>
          </TextField>
        }
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert> : null}
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 2 }}>
        {["ALL", "PROVIDER", "RIDER"].map((value) => (
          <Chip
            key={value}
            size="small"
            label={
              value === "ALL"
                ? t.admin.all
                : value === "PROVIDER"
                  ? t.admin.reportProvider
                  : t.admin.reportRider
            }
            color={targetKind === value ? "primary" : "default"}
            variant={targetKind === value ? "filled" : "outlined"}
            onClick={() => setTargetKind(value)}
          />
        ))}
      </Box>
      {reports.length === 0 ? (
        <EmptyState message={t.admin.noReports} />
      ) : (
        <MasterDetail
          empty={t.admin.selectPrompt}
          list={reports.map((report) => (
            <AdminListItem
              key={report.id}
              selected={report.id === selectedId}
              onClick={() => {
                select(report);
                setCaseReport(report);
              }}
              title={report.targetName ?? report.targetId}
              subtitle={`${report.targetKind === "PROVIDER" ? t.admin.reportProvider : t.admin.reportRider} · ${humanizeEnum(report.reason)}${report.ticketId ? ` · ${report.ticketId}` : ""} · ${ago(report.createdAt, t)}`}
              chip={adminStatusLabel(report.status, t)}
              chipColor={adminStatusTone(report.status)}
            />
          ))}
          detail={
            selected ? (
              <Card>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {selected.targetName ?? selected.targetId}
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={
                        selected.targetKind === "PROVIDER"
                          ? t.admin.reportProvider
                          : t.admin.reportRider
                      }
                    />
                    <Chip size="small" label={adminStatusLabel(selected.status, t)} color={adminStatusTone(selected.status)} />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {`${t.admin.reportReporter}: ${selected.reporterName ?? selected.reportedBy} · ${ago(selected.createdAt, t)}`}
                  </Typography>
                  <Typography variant="body2">
                    {`${t.admin.reportReason}: ${humanizeEnum(selected.reason)}`}
                  </Typography>
                  {selected.note ? (
                    <Typography variant="body2" color="text.secondary">
                      {selected.note}
                    </Typography>
                  ) : null}
                  {selected.ticket ? (
                    <>
                      <Typography variant="caption" color="text.secondary">
                        {`${selected.ticket.ticketType} · ${ticketStatusLabel(selected.ticket.status, t)}`}
                      </Typography>
                      <TicketTimeline history={selected.ticket.statusHistory} t={t} />
                    </>
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
                  {selected.photoUrls.length > 0 ? (
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {selected.photoUrls.map((url, index) => (
                        <Box
                          key={url}
                          sx={{ width: 84, height: 84, borderRadius: 2, overflow: "hidden", border: 1, borderColor: "divider" }}
                        >
                          <StorageImage
                            path={url}
                            sx={{ width: "100%", height: "100%" }}
                            onClick={() =>
                              setPreview({ photos: selected.photoUrls, index })
                            }
                          />
                        </Box>
                      ))}
                    </Box>
                  ) : null}
                  {selected.status === "OPEN" ? (
                    <>
                      <SettingField label={t.admin.reportAction}>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={action}
                          onChange={(e) => setAction(e.target.value)}
                        >
                          {(ACTIONS[selected.targetKind] ?? ["NONE"]).map((value) => (
                            <MenuItem key={value} value={value}>
                              {reportActionLabel(value, t)}
                            </MenuItem>
                          ))}
                        </TextField>
                      </SettingField>
                      <TextField
                        size="small"
                        label={t.admin.reviewNote}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        multiline
                        minRows={2}
                        fullWidth
                      />
                      <Button
                        size="small"
                        variant="contained"
                        disabled={busy}
                        sx={{ alignSelf: "flex-start" }}
                        onClick={() => {
                          if (action !== "NONE" && note.trim() === "") {
                            setError(t.admin.noteRequired);
                            return;
                          }
                          setError(null);
                          setConfirm(true);
                        }}
                      >
                        {t.admin.resolve}
                      </Button>
                    </>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      {`${t.admin.reportAction}: ${reportActionLabel(selected.action, t)}${selected.actionNote ? ` · ${selected.actionNote}` : ""}`}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ) : null
          }
        />
      )}
      {caseReport ? (
        <ReportCaseDialog
          token={token}
          report={caseReport}
          onClose={() => setCaseReport(null)}
          onDecided={() => {
            setCaseReport(null);
            setSelectedId(null);
            if (token) void load(token);
          }}
        />
      ) : null}
      <PhotoLightbox
        preview={preview}
        onClose={() => setPreview(null)}
        onChange={(index) => setPreview((prev) => (prev ? { ...prev, index } : prev))}
      />
      <Dialog open={confirm} onClose={() => setConfirm(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t.admin.confirmTitle}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="body2">
            {`${reportActionLabel(action, t)} · ${selected?.targetName ?? selected?.targetId ?? ""}`}
          </Typography>
          {note.trim() ? (
            <Typography variant="caption" color="text.secondary">
              {note}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(false)}>{t.common.cancel}</Button>
          <Button
            variant="contained"
            color={action === "SUSPEND" || action === "BLOCK" ? "error" : "primary"}
            disabled={busy}
            onClick={() => selected && void decide(selected)}
          >
            {t.admin.resolve}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
