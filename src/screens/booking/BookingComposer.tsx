import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import {
  createBooking,
  fetchBookingAvailability,
  type Booking,
  type BookingAvailability,
} from "../../api/bookings";
import type { Provider } from "../../api/providers";
import type { MeVehicle } from "../../api/users";
import type { Strings } from "../../i18n";

type Props = {
  t: Strings;
  token: string;
  shop: Provider;
  point: { lat: number; lng: number } | null;
  activeVehicle: MeVehicle | null;
  onClose: () => void;
  onCreated: (booking: Booking) => void;
};

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function timeLabel(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ?
    iso :
    date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function BookingComposer({
  t,
  token,
  shop,
  point,
  activeVehicle,
  onClose,
  onCreated,
}: Props) {
  const [date, setDate] = useState(todayKey());
  const [availability, setAvailability] = useState<BookingAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceCodes, setServiceCodes] = useState<string[]>([]);
  const [slotAt, setSlotAt] = useState<string | null>(null);
  const [customTime, setCustomTime] = useState("");
  const [arrivalMode, setArrivalMode] = useState<"SELF" | "TOW">("SELF");
  const [note, setNote] = useState("");

  const services = useMemo(() =>
    (shop.services ?? []).filter((service) =>
      !service.channels || service.channels.includes("BOOKING")), [shop.services]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setSlotAt(null);
    void fetchBookingAvailability(shop.id, token, date)
      .then((result) => {
        if (alive) setAvailability(result);
      })
      .catch((err) => {
        if (alive) setError(toMessage(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [shop.id, token, date]);

  const scheduledAt = slotAt ??
    (customTime.trim() !== "" ?
      new Date(`${date}T${customTime}:00`).toISOString() :
      "");

  function toggleService(code: string): void {
    setServiceCodes((current) =>
      current.includes(code) ?
        current.filter((item) => item !== code) :
        [...current, code]);
  }

  async function submit(): Promise<void> {
    if (busy) return;
    if (!activeVehicle) {
      setError(t.bookings.noVehicle);
      return;
    }
    if (arrivalMode === "TOW" && point === null) {
      setError(t.bookings.pickupMissing);
      return;
    }
    if (scheduledAt === "") {
      setError(t.bookings.invalidTime);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const booking = await createBooking({
        providerId: shop.id,
        scheduledAt,
        serviceCodes,
        ...(note.trim() ? { note: note.trim() } : {}),
        vehicleId: activeVehicle.id,
        arrivalMode,
        ...(arrivalMode === "TOW" && point ? { origin: point } : {}),
      }, token);
      onCreated(booking);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const freeForm = availability?.freeForm === true ||
    availability?.alwaysOpen === true;
  const deposit = availability !== null && availability.depositPolicy !== "NONE" ?
    availability.depositPolicy === "FIXED" ?
      availability.depositAmount :
      null :
    null;

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t.bookings.bookAt.replace("{shop}", shop.name)}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {!activeVehicle ? (
          <Alert severity="warning">{t.bookings.noVehicle}</Alert>
        ) : null}
        <TextField
          label={t.bookings.pickDate}
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        {loading ? <Typography variant="body2" color="text.secondary">{t.common.loading}</Typography> : null}
        {!loading && availability !== null && !freeForm && availability.slots.length === 0 ? (
          <Alert severity="info">{t.bookings.noSlots}</Alert>
        ) : null}
        {!freeForm && availability !== null && availability.slots.length > 0 ? (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{t.bookings.pickTime}</Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {availability.slots.map((slot) => (
                <Chip
                  key={slot.at}
                  label={`${timeLabel(slot.at)} · ${slot.remaining}`}
                  color={slotAt === slot.at ? "primary" : "default"}
                  variant={slotAt === slot.at ? "filled" : "outlined"}
                  onClick={() => setSlotAt(slot.at)}
                  disabled={slot.remaining <= 0}
                />
              ))}
            </Box>
          </Box>
        ) : null}
        {freeForm ? (
          <TextField
            label={t.bookings.requestTime}
            type="time"
            value={customTime}
            onChange={(event) => setCustomTime(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        ) : null}
        {services.length > 0 ? (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{t.bookings.services}</Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {services.map((service) => (
                <Chip
                  key={service.code}
                  label={`${service.name} · ${service.quoteRequired ? t.provider.serviceInspection : `${service.displayPrice.toLocaleString()} VND`}`}
                  color={serviceCodes.includes(service.code) ? "primary" : "default"}
                  variant={serviceCodes.includes(service.code) ? "filled" : "outlined"}
                  onClick={() => toggleService(service.code)}
                />
              ))}
            </Box>
          </Box>
        ) : null}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t.bookings.arrival}</Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={arrivalMode}
            onChange={(_, value: "SELF" | "TOW" | null) => {
              if (value !== null) setArrivalMode(value);
            }}
          >
            <ToggleButton value="SELF">{t.bookings.rideIt}</ToggleButton>
            <ToggleButton value="TOW">{t.bookings.towIt}</ToggleButton>
          </ToggleButtonGroup>
          {arrivalMode === "TOW" && point === null ? (
            <Alert severity="warning" sx={{ mt: 1 }}>{t.bookings.pickupMissing}</Alert>
          ) : null}
        </Box>
        {deposit !== null ? (
          <Typography variant="body2" color="text.secondary">
            {`${t.provider.depositDue}: ${deposit.toLocaleString()} VND`}
          </Typography>
        ) : null}
        <TextField
          label={t.bookings.note}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t.bookings.notePlaceholder}
          multiline
          minRows={2}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>{t.common.cancel}</Button>
        <Button
          variant="contained"
          onClick={() => void submit()}
          disabled={busy || !activeVehicle}
        >
          {t.bookings.send}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
