import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import Typography from "@mui/material/Typography";
import { useStrings } from "../context/LanguageContext";
import type { Flag } from "../api/flags";
import { flagStatusColor, flagStatusLabel } from "./flagStatus";

type FlagDetailSheetProps = {
  flag: Flag | null;
  isOwn: boolean;
  busy: boolean;
  voted: boolean;
  onClose: () => void;
  onConfirm: (flagId: string) => void;
  onRemove: (flagId: string) => void;
};

export default function FlagDetailSheet({
  flag,
  isOwn,
  busy,
  voted,
  onClose,
  onConfirm,
  onRemove,
}: FlagDetailSheetProps) {
  const { t } = useStrings();
  return (
    <SwipeableDrawer
      anchor="bottom"
      open={flag !== null}
      onClose={onClose}
      onOpen={() => undefined}
      disableSwipeToOpen
    >
      {flag && (
        <Box sx={{ p: 2, pb: 3, maxWidth: 480, mx: "auto", width: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {flag.type}
            </Typography>
            <Chip
              label={flagStatusLabel(flag.status, t)}
              size="small"
              sx={{
                bgcolor: flagStatusColor(flag.status),
                color: "#fff",
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {flag.voteCount ?? 0} {t.flag.votes} · {flag.lat.toFixed(5)},{" "}
            {flag.lng.toFixed(5)}
          </Typography>
          {flag.note && (
            <Typography variant="body1" sx={{ mt: 1 }}>
              {flag.note}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
            {flag.status === "1" && !isOwn && !voted && (
              <Button
                variant="contained"
                disabled={busy}
                onClick={() => onConfirm(flag.id)}
              >
                {t.flag.confirm}
              </Button>
            )}
            {isOwn && flag.status !== "3" && (
              <Button
                variant="outlined"
                color="error"
                disabled={busy}
                onClick={() => onRemove(flag.id)}
              >
                {t.flag.remove}
              </Button>
            )}
          </Box>
        </Box>
      )}
    </SwipeableDrawer>
  );
}
