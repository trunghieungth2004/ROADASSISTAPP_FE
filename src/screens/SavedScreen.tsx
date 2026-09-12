import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toMessage } from "../api/client";
import {
  deleteSavedRoute,
  listSavedRoutes,
  renameSavedRoute,
  type SavedRouteSummary,
} from "../api/routes";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";

export default function SavedScreen() {
  const { t } = useStrings();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<SavedRouteSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<SavedRouteSummary | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRoutes(await listSavedRoutes(token));
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRename() {
    if (!token || !renaming || name.trim().length === 0) {
      return;
    }
    setBusy(true);
    try {
      await renameSavedRoute(renaming.id, name.trim(), token);
      setRenaming(null);
      setName("");
      setNotice(t.saved.renamedMsg);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(routeId: string) {
    if (!token) {
      return;
    }
    setBusy(true);
    try {
      await deleteSavedRoute(routeId, token);
      setNotice(t.saved.deletedMsg);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2, overflowY: "auto", height: "100%" }}>
      <Typography variant="h6">{t.saved.title}</Typography>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mt: 1 }}>
          {notice}
        </Alert>
      )}
      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        {routes.length === 0 && !loading && (
          <Typography variant="body2" color="text.secondary">
            {t.saved.empty}
          </Typography>
        )}
        {routes.map((r) => (
          <Card key={r.id}>
            <CardContent>
              <Typography variant="subtitle1">{r.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {r.distanceMeters != null &&
                  `${(r.distanceMeters / 1000).toFixed(r.distanceMeters < 10000 ? 1 : 0)} km · `}
                {r.durationSeconds != null &&
                  `${(r.durationSeconds / 60).toFixed(r.durationSeconds < 600 ? 1 : 0)} min · `}
                {r.stops.length > 0 && `${r.stops.length} stops · `}
                {new Date(r.createdAt).toLocaleDateString()}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() =>
                    navigate("/route", { state: { savedRouteId: r.id } })
                  }
                >
                  {t.saved.load}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setRenaming(r);
                    setName(r.name);
                  }}
                >
                  {t.saved.rename}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  disabled={busy}
                  onClick={() => void onDelete(r.id)}
                >
                  {t.saved.delete}
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Dialog open={renaming !== null} onClose={() => setRenaming(null)} fullWidth>
        <DialogTitle>{t.saved.rename}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t.saved.name}
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenaming(null)}>{t.common.close}</Button>
          <Button
            variant="contained"
            disabled={busy || name.trim().length === 0}
            onClick={() => void onRename()}
          >
            {t.common.save}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
