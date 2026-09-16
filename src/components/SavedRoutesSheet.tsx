import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { toMessage } from "../api/client";
import {
  deleteSavedRoute,
  listSavedRoutes,
  renameSavedRoute,
  type SavedRouteSummary,
} from "../api/routes";

type SavedRoutesSheetProps = {
  open: boolean;
  token: string | null;
  title: string;
  emptyText: string;
  openText: string;
  loadingText: string;
  renameText: string;
  deleteText: string;
  nameLabel: string;
  saveText: string;
  cancelText: string;
  onClose: () => void;
  onOpen: (routeId: string) => void;
};

export default function SavedRoutesSheet({
  open,
  token,
  title,
  emptyText,
  openText,
  loadingText,
  renameText,
  deleteText,
  nameLabel,
  saveText,
  cancelText,
  onClose,
  onOpen,
}: SavedRoutesSheetProps) {
  const [routes, setRoutes] = useState<SavedRouteSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open || !token) {
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    listSavedRoutes(token)
      .then((list) => {
        if (alive) {
          setRoutes(list);
        }
      })
      .catch((err) => {
        if (alive) {
          setError(toMessage(err));
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [open, token]);

  async function onRename(routeId: string) {
    if (!token || name.trim().length === 0) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await renameSavedRoute(routeId, name.trim(), token);
      setRoutes((prev) =>
        prev.map((r) =>
          r.id === routeId ? { ...r, name: name.trim() } : r,
        ),
      );
      setRenamingId(null);
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
    setError(null);
    try {
      await deleteSavedRoute(routeId, token);
      setRoutes((prev) => prev.filter((r) => r.id !== routeId));
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer anchor="bottom" open={open} onClose={onClose}>
      <Box sx={{ p: 2, maxHeight: "70dvh", overflowY: "auto" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          <IconButton aria-label={title} onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
        {loading && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {loadingText}
          </Typography>
        )}
        {!loading && routes.length === 0 && !error && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {emptyText}
          </Typography>
        )}
        <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
          {routes.map((r) => (
            <Box
              key={r.id}
              sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
            >
              {renamingId === r.id ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <TextField
                    autoFocus
                    size="small"
                    label={nameLabel}
                    fullWidth
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    slotProps={{ htmlInput: { maxLength: 120 } }}
                    sx={{ flexGrow: 1 }}
                  />
                  <IconButton
                    aria-label={saveText}
                    disabled={busy || name.trim().length === 0}
                    onClick={() => void onRename(r.id)}
                  >
                    <CheckIcon />
                  </IconButton>
                  <IconButton
                    aria-label={cancelText}
                    disabled={busy}
                    onClick={() => setRenamingId(null)}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
              ) : (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {r.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.distanceMeters != null &&
                        `${(r.distanceMeters / 1000).toFixed(r.distanceMeters < 10000 ? 1 : 0)} km · `}
                      {r.durationSeconds != null &&
                        `${(r.durationSeconds / 60).toFixed(r.durationSeconds < 600 ? 1 : 0)} min · `}
                      {r.stops.length > 0 &&
                        `${r.stops.length} stops · `}
                      {new Date(r.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    disabled={busy}
                    onClick={() => {
                      onOpen(r.id);
                      onClose();
                    }}
                    sx={{ flexShrink: 0 }}
                  >
                    {openText}
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={busy}
                    onClick={() => {
                      setRenamingId(r.id);
                      setName(r.name);
                    }}
                    sx={{ flexShrink: 0 }}
                  >
                    {renameText}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={busy}
                    onClick={() => void onDelete(r.id)}
                    sx={{ flexShrink: 0 }}
                  >
                    {deleteText}
                  </Button>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    </Drawer>
  );
}
