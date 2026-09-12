import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Slider from "@mui/material/Slider";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import CarCrashIcon from "@mui/icons-material/CarCrash";
import FloodIcon from "@mui/icons-material/Flood";
import WarningIcon from "@mui/icons-material/Warning";
import { useStrings } from "../context/LanguageContext";
import type { FlagType } from "../api/flags";

export type FlagReport = {
  type: FlagType;
  radiusMeters: number;
  note?: string;
};

type FlagSheetProps = {
  open: boolean;
  lat: number;
  lng: number;
  busy: boolean;
  onClose: () => void;
  onSubmit: (report: FlagReport) => void;
};

export default function FlagSheet({
  open,
  lat,
  lng,
  busy,
  onClose,
  onSubmit,
}: FlagSheetProps) {
  const { t } = useStrings();
  const [type, setType] = useState<FlagType>("FLOOD");
  const [radius, setRadius] = useState(200);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setType("FLOOD");
      setRadius(200);
      setNote("");
    }
  }, [open ]);

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={() => undefined}
      disableSwipeToOpen
    >
      <Box sx={{ p: 2, pb: 3, maxWidth: 480, mx: "auto", width: "100%" }}>
        <Typography variant="h6">{t.flag.reportTitle}</Typography>
        <Typography variant="body2" color="text.secondary">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </Typography>
        <Typography variant="subtitle2" sx={{ mt: 2 }}>
          {t.flag.type}
        </Typography>
        <ToggleButtonGroup
          value={type}
          exclusive
          fullWidth
          onChange={(_, v: FlagType | null) => {
            if (v) {
              setType(v);
            }
          }}
          sx={{ mt: 1 }}
        >
          <ToggleButton value="FLOOD">
            <FloodIcon sx={{ mr: 1 }} />
            {t.flag.flood}
          </ToggleButton>
          <ToggleButton value="OBSTRUCTION">
            <WarningIcon sx={{ mr: 1 }} />
            {t.flag.obstruction}
          </ToggleButton>
          <ToggleButton value="ACCIDENT">
            <CarCrashIcon sx={{ mr: 1 }} />
            {t.flag.accident}
          </ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="subtitle2" sx={{ mt: 2 }}>
          {t.flag.radius}: {radius} m
        </Typography>
        <Slider
          value={radius}
          min={25}
          max={3000}
          step={25}
          onChange={(_, v) => setRadius(v as number)}
          valueLabelDisplay="auto"
        />
        <TextField
          label={t.flag.note}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          fullWidth
          multiline
          rows={2}
          sx={{ mt: 1 }}
        />
        <Button
          variant="contained"
          fullWidth
          disabled={busy}
          sx={{ mt: 2 }}
          onClick={() =>
            onSubmit({ type, radiusMeters: radius, note: note || undefined })
          }
        >
          {t.flag.submit}
        </Button>
      </Box>
    </SwipeableDrawer>
  );
}
