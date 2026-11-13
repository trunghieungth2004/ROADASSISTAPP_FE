import { useCallback, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toMessage } from "../api/client";
import { chatMessages, openChat, sendChatMessage, type ChatMessage, type ChatScope } from "../api/chat";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";
import StorageImage from "./StorageImage";
import PhotoLightbox, { type PhotoPreview } from "./PhotoLightbox";

export default function ChatDialog({
  scope,
  refId,
  title,
  onClose,
}: {
  scope: ChatScope;
  refId: string;
  title: string;
  onClose: () => void;
}) {
  const { t } = useStrings();
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PhotoPreview | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setMessages(await chatMessages(scope, refId, token));
      setError(null);
    } catch (err) {
      setError(toMessage(err));
    }
  }, [token, scope, refId]);

  useEffect(() => {
    if (!token) return;
    void openChat(scope, refId, token).catch((err) => setError(toMessage(err)));
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [token, scope, refId, load]);

  async function send() {
    if (!token || busy || !draft.trim()) return;
    setBusy(true);
    try {
      const sent = await sendChatMessage(scope, refId, draft.trim(), token);
      setMessages((prev) => [...prev, sent]);
      setDraft("");
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t.chat.title} · {title}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1, minHeight: 260 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {messages.length === 0 && <Typography color="text.secondary">{t.chat.empty}</Typography>}
        {messages.map((message) => (
          <Box key={message.id} sx={{ alignSelf: message.senderUid === "system" ? "center" : "flex-start", maxWidth: "90%" }}>
            <Typography variant="caption" color="text.secondary">
              {message.senderName ?? (message.senderUid === "system" ? t.chat.system : t.chat.you)}
            </Typography>
            <Box sx={{ bgcolor: "action.hover", borderRadius: 2, px: 1.5, py: 1 }}>
              {message.text ? (
                <Typography variant="body2">{message.text}</Typography>
              ) : null}
              {message.photoUrls.length > 0 ? (
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: message.text ? 0.5 : 0 }}>
                  {message.photoUrls.map((path, index) => (
                    <Box
                      key={path}
                      sx={{ width: 96, height: 96, borderRadius: 1.5, overflow: "hidden", border: 1, borderColor: "divider" }}
                    >
                      <StorageImage
                        path={path}
                        sx={{ width: "100%", height: "100%" }}
                        onClick={() => setPreview({ photos: message.photoUrls, index })}
                      />
                    </Box>
                  ))}
                </Box>
              ) : null}
            </Box>
          </Box>
        ))}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <TextField size="small" fullWidth value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t.chat.placeholder} />
        <Button variant="contained" disabled={busy || !draft.trim()} onClick={() => void send()}>{t.chat.send}</Button>
      </DialogActions>
      <PhotoLightbox
        preview={preview}
        onClose={() => setPreview(null)}
        onChange={(index) => setPreview((prev) => (prev ? { ...prev, index } : prev))}
      />
    </Dialog>
  );
}
