import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useStrings } from "../context/LanguageContext";
import {
  MOBILE_REPO_URL,
  MOBILE_RELEASES_URL,
} from "../config/mobileLinks";

export { MOBILE_REPO_URL, MOBILE_RELEASES_URL };

export default function AssistCtaDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useStrings();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t.assistCta.title}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Typography variant="body2" color="text.secondary">{t.assistCta.body}</Typography>
        <Button variant="contained" href={MOBILE_RELEASES_URL} target="_blank" rel="noopener noreferrer">
          {t.assistCta.download}
        </Button>
        <Button variant="outlined" href={MOBILE_REPO_URL} target="_blank" rel="noopener noreferrer">
          {t.assistCta.source}
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t.common.close}</Button>
      </DialogActions>
    </Dialog>
  );
}
