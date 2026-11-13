import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Rating from "@mui/material/Rating";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import {
  adminAppeals,
  adminDecideAppeal,
  type AdminAppeal,
} from "../../api/admin";
import { useStrings } from "../../context/LanguageContext";
import StorageImage from "../../components/StorageImage";
import PhotoLightbox, { type PhotoPreview } from "../../components/PhotoLightbox";
import AdminListItem from "./AdminListItem";
import EmptyState from "./EmptyState";
import MasterDetail from "./MasterDetail";
import PanelHeader from "./PanelHeader";
import SettingField from "./SettingField";
import { ago } from "./format";
import { useAdminBill } from "./AdminBillContext";
import { adminStatusLabel, adminStatusTone, appealResolutionLabel, appealSubjectLabel, humanizeEnum } from "./adminLabels";

const SUBJECTS = ["ALL", "RATING", "REPORT", "DISPUTE"];

function optionsFor(subjectKind: string): string[] {
  if (subjectKind === "RATING") return ["KEEP", "REMOVE"];
  if (subjectKind === "REPORT") return ["UPHOLD", "OVERTURN"];
  return ["UPHOLD", "OVERTURN", "ADJUST"];
}

function optionHint(value: string, t: ReturnType<typeof useStrings>["t"]): string {
  if (value === "OVERTURN") return t.admin.appealOverturnHint;
  if (value === "ADJUST") return t.admin.appealAdjustHint;
  if (value === "REMOVE") return t.admin.appealRemoveHint;
  return t.admin.appealUpholdHint;
}

function snapshotRows(
  appeal: AdminAppeal,
  t: ReturnType<typeof useStrings>["t"],
): Array<[string, string]> {
  const s = appeal.snapshot;
  const text = (key: string): string =>
    typeof s[key] === "string" || typeof s[key] === "number" ?
      String(s[key]) :
      "";
  const rows: Array<[string, string]> = appeal.subjectKind === "RATING" ? [
    [t.admin.ratingSnapshot, text("score")],
    [t.admin.appealSubjectType, text("targetKind")],
    [t.admin.ratingBy, text("byUserId")],
    [t.admin.appealTicket, text("ticketId")],
  ] : appeal.subjectKind === "REPORT" ? [
    [t.admin.reportReason, text("reason")],
    [t.admin.reportAction, text("action")],
    [t.admin.reviewNote, text("note")],
    [t.admin.appealTicket, text("ticketId")],
  ] : [
    [t.admin.reportReason, text("type")],
    [t.admin.reportReason, text("reasonCode")],
    [t.admin.outcome, text("outcome")],
    [t.admin.resolution, text("resolution")],
    [t.admin.currentCharge, text("adjustedAmount")],
    [t.admin.appealTicket, text("ticketId")],
  ];
  return rows.filter((row) => row[1] !== "");
}

export default function AppealsPanel({ token }: { token: string | null }) {
  const { t } = useStrings();
  const { openBill } = useAdminBill();
  const [appeals, setAppeals] = useState<AdminAppeal[]>([]);
  const [subjectKind, setSubjectKind] = useState("ALL");
  const [status, setStatus] = useState("OPEN");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("UPHOLD");
  const [note, setNote] = useState("");
  const [adjustedAmount, setAdjustedAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<PhotoPreview | null>(null);

  async function load(key: string) {
    setError(null);
    try {
      setAppeals(await adminAppeals(
        key,
        subjectKind === "ALL" ? undefined : subjectKind,
        status === "ALL" ? undefined : status,
      ));
    } catch (err) {
      setError(toMessage(err));
    }
  }

  useEffect(() => {
    if (token) void load(token);
  }, [token, subjectKind, status]);

  const selected = appeals.find((appeal) => appeal.id === selectedId) ?? null;

  function select(appeal: AdminAppeal): void {
    setSelectedId(appeal.id);
    setResolution(optionsFor(appeal.subjectKind)[0]);
    setNote("");
    setAdjustedAmount("");
    setNotice(null);
  }

  async function decide(appeal: AdminAppeal): Promise<void> {
    if (!token || busy) return;
    if (note.trim() === "") {
      setError(t.admin.noteRequired);
      return;
    }
    if (resolution === "ADJUST" && adjustedAmount.trim() === "") {
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
        ...(resolution === "ADJUST" ?
          { adjustedAmount: Number(adjustedAmount) } :
          {}),
      });
      setSelectedId(null);
      await load(token);
      setNotice(t.admin.appealDecided);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const rating = selected?.subjectKind === "RATING" ?
    Number(selected.snapshot.score ?? 0) :
    null;

  return (
    <Box>
      <PanelHeader
        title={t.admin.appeals}
        onRefresh={() => token && void load(token)}
        refreshLabel={t.admin.refresh}
        action={
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <TextField
              select
              size="small"
              label={t.admin.appealSubjectType}
              value={subjectKind}
              onChange={(event) => setSubjectKind(event.target.value)}
              sx={{ minWidth: 140 }}
            >
              {SUBJECTS.map((value) => (
                <MenuItem key={value} value={value}>
                  {value === "ALL" ? t.admin.all : appealSubjectLabel(value, t)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label={t.admin.status}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="OPEN">OPEN</MenuItem>
              <MenuItem value="RESOLVED">RESOLVED</MenuItem>
              <MenuItem value="DISMISSED">DISMISSED</MenuItem>
              <MenuItem value="ALL">{t.admin.allStatuses}</MenuItem>
            </TextField>
          </Box>
        }
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert> : null}
      {appeals.length === 0 ? (
        <EmptyState message={t.admin.noAppeals} />
      ) : (
        <MasterDetail
          empty={t.admin.selectPrompt}
          list={appeals.map((appeal) => (
            <AdminListItem
              key={appeal.id}
              selected={appeal.id === selectedId}
              onClick={() => select(appeal)}
              title={`${appealSubjectLabel(appeal.subjectKind, t)} · ${appeal.appellantName}`}
              subtitle={`${humanizeEnum(appeal.reason)} · ${ago(appeal.createdAt, t)}`}
              chip={adminStatusLabel(appeal.status, t)}
              chipColor={adminStatusTone(appeal.status)}
            />
          ))}
          detail={
            selected ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Card>
                  <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {`${appealSubjectLabel(selected.subjectKind, t)} · ${selected.appellantName}`}
                      </Typography>
                      <Chip size="small" variant="outlined" label={appealSubjectLabel(selected.subjectKind, t)} />
                      <Chip size="small" label={adminStatusLabel(selected.status, t)} color={adminStatusTone(selected.status)} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {`${t.admin.appealFiledBy}: ${selected.appellantName} · ${ago(selected.createdAt, t)}`}
                    </Typography>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="subtitle2">{t.admin.appealSnapshot}</Typography>
                    {selected.subjectKind === "RATING" && rating !== null ? (
                      <Rating value={rating} readOnly size="small" />
                    ) : null}
                    {snapshotRows(selected, t).map(([label, value]) => (
                      <Box key={`${label}-${value}`} sx={{ display: "flex", gap: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 110 }}>
                          {label}
                        </Typography>
                        <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                          {value}
                        </Typography>
                      </Box>
                    ))}
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
                  </CardContent>
                </Card>
                <Card>
                  <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="subtitle2">{t.admin.appealReason}</Typography>
                    <Typography variant="body2">{humanizeEnum(selected.reason)}</Typography>
                    {selected.note ? (
                      <Typography variant="body2" color="text.secondary">
                        {selected.note}
                      </Typography>
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
                              onClick={() => setPreview({ photos: selected.photoUrls, index })}
                            />
                          </Box>
                        ))}
                      </Box>
                    ) : null}
                  </CardContent>
                </Card>
                {selected.status === "OPEN" ? (
                  <Card>
                    <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <Typography variant="subtitle2">{t.admin.appealDecision}</Typography>
                      <SettingField label={t.admin.appealDecision}>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={resolution}
                          onChange={(event) => setResolution(event.target.value)}
                        >
                          {optionsFor(selected.subjectKind).map((value) => (
                            <MenuItem key={value} value={value}>
                              {appealResolutionLabel(value, t)}
                            </MenuItem>
                          ))}
                        </TextField>
                      </SettingField>
                      <Typography variant="caption" color="text.secondary">
                        {optionHint(resolution, t)}
                      </Typography>
                      {resolution === "ADJUST" ? (
                        <TextField
                          size="small"
                          label={t.admin.appealAdjustedAmount}
                          value={adjustedAmount}
                          onChange={(event) => setAdjustedAmount(event.target.value)}
                          type="number"
                        />
                      ) : null}
                      <TextField
                        size="small"
                        label={t.admin.reviewNote}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        multiline
                        minRows={2}
                        fullWidth
                      />
                      <Button
                        size="small"
                        variant="contained"
                        disabled={busy}
                        sx={{ alignSelf: "flex-start" }}
                        onClick={() => void decide(selected)}
                      >
                        {t.admin.resolve}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Alert severity="info">
                    {`${selected.resolution ? appealResolutionLabel(selected.resolution, t) : adminStatusLabel(selected.status, t)}${selected.decisionNote ? ` · ${selected.decisionNote}` : ""}${selected.decidedAt ? ` · ${ago(selected.decidedAt, t)}` : ""}`}
                  </Alert>
                )}
              </Box>
            ) : null
          }
        />
      )}
      <PhotoLightbox
        preview={preview}
        onClose={() => setPreview(null)}
        onChange={(index) => setPreview((prev) => (prev ? { ...prev, index } : prev))}
      />
    </Box>
  );
}
