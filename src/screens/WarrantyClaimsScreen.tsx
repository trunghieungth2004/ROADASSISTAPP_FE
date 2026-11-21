import { formatDateDMY } from "../utils/date";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { toMessage } from "../api/client";
import { disputeWarrantyClaim, myWarrantyClaims, type WarrantyClaim } from "../api/warranty";
import Screen from "../components/ui/Screen";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";

function statusColor(status: string): "success" | "warning" | "error" | "default" {
  if (status === "COMPLETED" || status === "RESOLVED") return "success";
  if (status === "OPEN" || status === "REBOOKED") return "warning";
  if (status === "DECLINED" || status === "DISPUTED") return "error";
  return "default";
}

export default function WarrantyClaimsScreen() {
  const { t } = useStrings();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [disputeFor, setDisputeFor] = useState<WarrantyClaim | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setClaims(await myWarrantyClaims(token));
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitDispute() {
    if (!token || !disputeFor || busy) return;
    setBusy(true);
    setError(null);
    try {
      await disputeWarrantyClaim(token, disputeFor.id, note.trim() || undefined);
      setDisputeFor(null);
      setNote("");
      setNotice(t.bills.warrantyDisputeDone);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate("/more")}>
          {t.common.back}
        </Button>
      </Box>
      <Typography variant="h6" sx={{ mt: 1 }}>
        {t.more.warrantyClaims}
      </Typography>
      {loading ? (
        <Typography sx={{ mt: 2 }} color="text.secondary">
          {t.common.loading}
        </Typography>
      ) : null}
      {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mt: 2 }}>{notice}</Alert> : null}
      {!loading && claims.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>{t.bills.warrantyEmpty}</Alert>
      ) : null}
      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {claims.map((claim) => (
          <Card key={claim.id}>
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                <Typography variant="subtitle1">{claim.serviceName}</Typography>
                <Chip size="small" label={claim.status} color={statusColor(claim.status)} />
              </Box>
              <Typography variant="body2">{claim.reason}</Typography>
              <Typography variant="caption" color="text.secondary">
                {`${t.bills.warranty}: ${formatDateDMY(claim.warrantyUntil)}${typeof claim.lineAmount === "number" ? ` · ${claim.lineAmount.toLocaleString()} VND` : ""}`}
              </Typography>
              {claim.declineReasonCode ? (
                <Typography variant="caption" color="text.secondary">
                  {`${t.admin.warrantyDeclineReason}: ${claim.declineReasonCode}`}
                </Typography>
              ) : null}
              {claim.shopResponse ? (
                <Typography variant="caption" color="text.secondary">
                  {`${t.admin.warrantyShopResponse}: ${claim.shopResponse}`}
                </Typography>
              ) : null}
              {claim.disputeNote ? (
                <Typography variant="caption" color="text.secondary">
                  {`${t.admin.warrantyDisputeNote}: ${claim.disputeNote}`}
                </Typography>
              ) : null}
              {claim.resolutionNote ? (
                <Typography variant="caption" color="text.secondary">
                  {`${t.admin.warrantyResolutionNote}: ${claim.resolutionNote}`}
                </Typography>
              ) : null}
              {claim.refundAmount !== null && claim.refundAmount !== undefined ? (
                <Typography variant="caption" color="success.main">
                  {`${t.bills.refund}: ${claim.refundAmount.toLocaleString()} VND`}
                </Typography>
              ) : null}
              {claim.status === "DECLINED" ? (
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ alignSelf: "flex-start" }}
                  onClick={() => {
                    setDisputeFor(claim);
                    setNote("");
                  }}
                >
                  {t.bills.warrantyDispute}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </Box>
      <Dialog open={disputeFor !== null} onClose={() => setDisputeFor(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t.bills.warrantyDispute}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {t.bills.warrantyDisputeHint}
          </Typography>
          <TextField
            label={t.bills.warrantyDisputeHint}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisputeFor(null)}>{t.common.cancel}</Button>
          <Button variant="contained" disabled={busy} onClick={() => void submitDispute()}>
            {t.bills.warrantyDisputeSubmit}
          </Button>
        </DialogActions>
      </Dialog>
    </Screen>
  );
}
