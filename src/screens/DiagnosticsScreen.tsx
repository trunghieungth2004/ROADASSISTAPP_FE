import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Screen from "../components/ui/Screen";
import { flagsNear } from "../api/flags";
import { config } from "../config";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";
import { mapDefaults } from "../map/style";

export default function DiagnosticsScreen() {
  const { t, lang } = useStrings();
  const { token, uid } = useAuth();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    const started = performance.now();
    try {
      await flagsNear(mapDefaults.center[1], mapDefaults.center[0], 2000, token);
      setResult(`${t.diagnostics.ok} · ${Math.round(performance.now() - started)} ms`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen maxWidth="sm">
      <Typography variant="h6">{t.diagnostics.title}</Typography>
      <Card sx={{ mt: 2 }}>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="body2">API: {config.apiBaseUrl || "same origin"}</Typography>
          <Typography variant="body2">MapTiler: {config.maptilerKey ? t.diagnostics.configured : t.diagnostics.missing}</Typography>
          <Typography variant="body2">UID: {uid ?? "—"}</Typography>
          <Typography variant="body2">Language: {lang.toUpperCase()}</Typography>
          <Button variant="contained" disabled={busy || !token} onClick={() => void run()}>{t.diagnostics.run}</Button>
          {result && <Alert severity="success">{result}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
        </CardContent>
      </Card>
    </Screen>
  );
}
