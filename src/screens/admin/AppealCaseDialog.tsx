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
  adminDecideAppeal,
  type AdminAppeal,
} from "../../api/admin";
import { useStrings } from "../../context/LanguageContext";
import StorageImage from "../../components/StorageImage";
import PhotoLightbox, { type PhotoPreview } from "../../components/PhotoLightbox";
import { ago } from "./format";
import { useAdminBill } from "./AdminBillContext";
import { adminStatusLabel, adminStatusTone, appealResolutionLabel, appealSubjectLabel, humanizeEnum } from "./adminLabels";

function optionsFor(subjectKind: string): string[] {
  if (subjectKind === "RATING") return ["KEEP", "REMOVE"];
  if (subjectKind === "REPORT") return ["UPHOLD", "OVERTURN"];
  return ["UPHOLD", "OVERTURN", "ADJUST"];
}

function optionLabel(value: string, t: ReturnType<typeof useStrings>["t"]): string {
  if (value === "KEEP") return t.admin.keepRating;
  if (value === "REMOVE") return t.admin.removeRating;
  if (value === "UPHOLD") return t.admin.appealUphold;
  if (value === "OVERTURN") return t.admin.appealOverturn;
  return t.admin.appealAdjust;
}

export default function AppealCaseDialog({
  token,
  appeal,
  onClose,
  onDecided,
}: {
  token: string | null;
  appeal: AdminAppeal;
  onClose: () => void;
  onDecided: () => void;
}) {
  const { t } = useStrings();
  const { openBill } = useAdminBill();
  const [resolution, setResolution] = useState(optionsFor(appeal.subjectKind)[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PhotoPreview | null>(null);

  async function decide(): Promise<void> {
    if (!token || busy) return;
    if (note.trim() === "") {
      setError(t.admin.noteRequired);
      return;
    }
    if (resolution === "ADJUST" && amount.trim() === "") {
      setError(t.admin.appealAdjustedAmount);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminDecideAppeal(token, {
        appealId: appeal.id,
        resolution,
        note: note.trim(),
        ...(resolution === "ADJUST" ? { adjustedAmount: Number(amount) } : {}),
      });
      onDecided();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const rows = Object.entries(appeal.snapshot)
    .filter(([, value]) => typeof value === "string" || typeof value === "number")
    .map(([key, value]) => [key, String(value)] as [string, string]);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" slotProps={{ paper: { sx: { maxHeight: "90vh" } } }}>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>{`${t.admin.appealDetails}: ${appealSubjectLabel(appeal.subjectKind, t)}`}</Typography>
          <Chip size="small" label={adminStatusLabel(appeal.status, t)} color={adminStatusTone(appeal.status)} />
        </Box>
        <Typography variant="caption" color="text.secondary">
          {`${t.admin.appealFiledBy}: ${appeal.appellantName} · ${ago(appeal.createdAt, t)}`}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Typography variant="subtitle2">{t.admin.appealSnapshot}</Typography>
        {rows.map(([label, value]) => (
          <Typography key={label} variant="caption" color="text.secondary">
            {`${humanizeEnum(label)}: ${humanizeEnum(value)}`}
          </Typography>
        ))}
        {appeal.ticketId ? (
          <Button size="small" variant="outlined" sx={{ alignSelf: "flex-start" }} onClick={() => openBill(appeal.ticketId as string)}>
            {`${t.admin.viewBill} · ${appeal.ticketId}`}
          </Button>
        ) : null}
        <Typography variant="subtitle2">{t.admin.appealReason}</Typography>
        <Typography variant="body2">{humanizeEnum(appeal.reason)}</Typography>
        {appeal.note ? <Typography variant="body2" color="text.secondary">{appeal.note}</Typography> : null}
        {appeal.photoUrls.length > 0 ? (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {appeal.photoUrls.map((url, index) => (
              <Box key={url} sx={{ width: 84, height: 84, borderRadius: 2, overflow: "hidden", border: 1, borderColor: "divider" }}>
                <StorageImage path={url} sx={{ width: "100%", height: "100%" }} onClick={() => setPreview({ photos: appeal.photoUrls, index })} />
              </Box>
            ))}
          </Box>
        ) : null}
        {appeal.status === "OPEN" ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="subtitle2">{t.admin.appealDecision}</Typography>
            <TextField select size="small" value={resolution} onChange={(event) => setResolution(event.target.value)}>
              {optionsFor(appeal.subjectKind).map((value) => (
                <MenuItem key={value} value={value}>{optionLabel(value, t)}</MenuItem>
              ))}
            </TextField>
            {resolution === "ADJUST" ? (
              <TextField size="small" type="number" label={t.admin.appealAdjustedAmount} value={amount} onChange={(event) => setAmount(event.target.value)} />
            ) : null}
            <TextField size="small" label={t.admin.reviewNote} value={note} onChange={(event) => setNote(event.target.value)} multiline minRows={2} />
          </Box>
        ) : (
          <Alert severity="info">{`${appeal.resolution ? appealResolutionLabel(appeal.resolution, t) : adminStatusLabel(appeal.status, t)}${appeal.decisionNote ? ` · ${appeal.decisionNote}` : ""}`}</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t.common.close}</Button>
        {appeal.status === "OPEN" ? <Button variant="contained" disabled={busy} onClick={() => void decide()}>{t.admin.resolve}</Button> : null}
      </DialogActions>
      <PhotoLightbox preview={preview} onClose={() => setPreview(null)} onChange={(index) => setPreview((prev) => (prev ? { ...prev, index } : prev))} />
    </Dialog>
  );
}
