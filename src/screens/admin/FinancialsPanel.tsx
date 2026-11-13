import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { toMessage } from "../../api/client";
import { downloadReport } from "../../api/admin";
import { useStrings } from "../../context/LanguageContext";
import PanelHeader from "./PanelHeader";
import SettingField from "./SettingField";

export default function FinancialsPanel({ token }: { token: string | null }) {
  const { t } = useStrings();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function download(kind: "revenue" | "payees") {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await downloadReport(
        kind,
        {
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
        },
        token,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${kind}-${from || "start"}-${to || "now"}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice(t.admin.saved);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box>
      <PanelHeader title={t.admin.financials} refreshLabel={t.admin.refresh} />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert> : null}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, maxWidth: 520 }}>
          <SettingField label={t.admin.fromDate}>
            <TextField
              size="small"
              type="date"
              fullWidth
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </SettingField>
          <SettingField label={t.admin.toDate}>
            <TextField
              size="small"
              type="date"
              fullWidth
              value={to}
              onChange={(e) => setTo(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </SettingField>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="contained" disabled={busy} onClick={() => void download("revenue")}>
            {t.admin.downloadRevenue}
          </Button>
          <Button variant="outlined" disabled={busy} onClick={() => void download("payees")}>
            {t.admin.downloadPayees}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
