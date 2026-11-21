import { formatDateDMY } from "../../utils/date";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Rating from "@mui/material/Rating";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import {
  adminDecideReport,
  type AdminPersonContext,
  type AdminReport,
} from "../../api/admin";
import { useStrings } from "../../context/LanguageContext";
import StorageImage from "../../components/StorageImage";
import PhotoLightbox, { type PhotoPreview } from "../../components/PhotoLightbox";
import TicketTimeline from "./TicketTimeline";
import { ago } from "./format";
import { useAdminBill } from "./AdminBillContext";
import { adminStatusLabel, adminStatusTone, humanizeEnum } from "./adminLabels";

const ACTIONS: Record<string, string[]> = {
  PROVIDER: ["NONE", "WARN", "RESTRICT", "SUSPEND"],
  RIDER: ["NONE", "WARN", "RESTRICT", "BLOCK"],
};

function PersonCard({
  person,
  t,
}: {
  person: AdminPersonContext | null;
  t: ReturnType<typeof useStrings>["t"];
}) {
  if (!person) {
    return <Alert severity="info">{t.admin.noContext}</Alert>;
  }
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 1.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="subtitle2">{person.name || person.id}</Typography>
        <Chip size="small" variant="outlined" label={humanizeEnum(person.kind)} />
        {person.status ? <Chip size="small" label={adminStatusLabel(person.status, t)} color={adminStatusTone(person.status)} /> : null}
        {person.suspended ? <Chip size="small" color="error" label={t.admin.suspendedNote} /> : null}
        {person.conductFlag ? <Chip size="small" color="warning" label={t.admin.conductFlag} /> : null}
      </Box>
      {person.email ? <Typography variant="caption" color="text.secondary">{person.email}</Typography> : null}
      {person.phone ? <Typography variant="caption" color="text.secondary">{`${t.admin.phone}: ${person.phone}`}</Typography> : null}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
        <Rating value={person.ratingAvg} readOnly size="small" />
        <Typography variant="caption" color="text.secondary">
          {`${person.ratingAvg.toFixed(1)} (${person.ratingCount})`}
        </Typography>
        <Chip
          size="small"
          color={person.trustScore >= 70 ? "success" : person.trustScore >= 40 ? "warning" : "error"}
          label={`${t.admin.trust}: ${person.trustScore}`}
        />
        <Chip
          size="small"
          color={(person.standingScore ?? 100) < 50 ? "error" : (person.standingScore ?? 100) < 60 ? "warning" : "success"}
          label={`${t.admin.standing}: ${person.standingScore ?? 100}`}
        />
      </Box>
      {person.providerKind ? (
        <Typography variant="caption" color="text.secondary">
          {`${humanizeEnum(person.providerKind)} · ${person.accepting ? t.admin.dutyOn : t.admin.dutyOff}${typeof person.declineCount === "number" ? ` · ${t.admin.declines}: ${person.declineCount}` : ""}`}
        </Typography>
      ) : null}
      {person.restrictedUntil ? (
        <Typography variant="caption" color="error.main">
          {`${t.admin.restrictedUntil}: ${formatDateDMY(person.restrictedUntil)}${person.restrictionReason ? ` · ${person.restrictionReason}` : ""}`}
        </Typography>
      ) : null}
    </Box>
  );
}

export default function ReportCaseDialog({
  token,
  report,
  onClose,
  onDecided,
}: {
  token: string | null;
  report: AdminReport;
  onClose: () => void;
  onDecided: () => void;
}) {
  const { t } = useStrings();
  const { openBill } = useAdminBill();
  const [action, setAction] = useState("NONE");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PhotoPreview | null>(null);

  async function decide(): Promise<void> {
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
      onDecided();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function actionLabel(value: string): string {
    if (value === "WARN") return t.admin.actionWarn;
    if (value === "RESTRICT") return t.admin.actionRestrict;
    if (value === "SUSPEND") return t.admin.actionSuspend;
    if (value === "BLOCK") return t.admin.actionBlock;
    return t.admin.actionNone;
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg" slotProps={{ paper: { sx: { maxHeight: "90vh" } } }}>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>{`${t.admin.reportCase}: ${report.targetName ?? report.targetId}`}</Typography>
          <Chip size="small" label={adminStatusLabel(report.status, t)} color={adminStatusTone(report.status)} />
          <Chip size="small" variant="outlined" label={report.targetKind === "PROVIDER" ? t.admin.reportProvider : t.admin.reportRider} />
        </Box>
        <Typography variant="caption" color="text.secondary">
          {`${t.admin.reportReporter}: ${report.reporterName ?? report.reportedBy} · ${ago(report.createdAt, t)}`}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{t.admin.reportedPerson}</Typography>
            <PersonCard person={report.targetContext} t={t} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{t.admin.reporter}</Typography>
            <PersonCard person={report.reporterContext} t={t} />
          </Box>
        </Box>
        <Divider />
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t.admin.evidence}</Typography>
          <Typography variant="body2">{`${t.admin.reportReason}: ${report.reason}`}</Typography>
          {report.note ? <Typography variant="body2" color="text.secondary">{report.note}</Typography> : null}
          {report.photoUrls.length > 0 ? (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
              {report.photoUrls.map((url, index) => (
                <Box key={url} sx={{ width: 92, height: 92, borderRadius: 2, overflow: "hidden", border: 1, borderColor: "divider" }}>
                  <StorageImage path={url} sx={{ width: "100%", height: "100%" }} onClick={() => setPreview({ photos: report.photoUrls, index })} />
                </Box>
              ))}
            </Box>
          ) : null}
        </Box>
        {report.ticket ? (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{t.admin.ticketContext}</Typography>
            <Typography variant="body2">
              {`${report.ticket.ticketType} · ${report.ticket.status}${report.ticket.paymentStatus ? ` · ${report.ticket.paymentStatus}` : ""}`}
            </Typography>
            <TicketTimeline history={report.ticket.statusHistory} t={t} />
            <Button
              size="small"
              variant="outlined"
              sx={{ mt: 1 }}
              onClick={() => openBill(report.ticketId as string)}
            >
              {`${t.admin.viewBill} · ${report.ticketId}`}
            </Button>
          </Box>
        ) : null}
        {report.status === "OPEN" ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Divider />
            <Typography variant="subtitle2">{t.admin.reportAction}</Typography>
            <TextField select size="small" value={action} onChange={(event) => setAction(event.target.value)}>
              {(ACTIONS[report.targetKind] ?? ["NONE"]).map((value) => (
                <MenuItem key={value} value={value}>{actionLabel(value)}</MenuItem>
              ))}
            </TextField>
            <TextField size="small" label={t.admin.reviewNote} value={note} onChange={(event) => setNote(event.target.value)} multiline minRows={2} />
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t.common.close}</Button>
        {report.status === "OPEN" ? (
          <Button variant="contained" disabled={busy} onClick={() => void decide()}>
            {t.admin.resolve}
          </Button>
        ) : null}
      </DialogActions>
      <PhotoLightbox preview={preview} onClose={() => setPreview(null)} onChange={(index) => setPreview((prev) => (prev ? { ...prev, index } : prev))} />
    </Dialog>
  );
}
