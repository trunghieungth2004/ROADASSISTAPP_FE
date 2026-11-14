import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import {
  arriveBooking,
  cancelBooking,
  depositCheckout,
  myBookings,
  type Booking,
} from "../../api/bookings";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import type { Strings } from "../../i18n";
import {
  bookingStatusColor,
  bookingStatusLabel,
} from "./bookingLabels";

function whenLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function isUpcoming(booking: Booking): boolean {
  return booking.status === "REQUESTED" ||
    booking.status === "CONFIRMED" ||
    booking.status === "ARRIVED";
}

export default function MyBookingsPanel({
  t,
  token,
  refreshKey,
}: {
  t: Strings;
  token: string;
  refreshKey: number;
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelFor, setCancelFor] = useState<Booking | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await myBookings(token);
      setRows(result.bookings);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const groups = useMemo(() => ({
    upcoming: rows.filter(isUpcoming),
    past: rows.filter((row) => !isUpcoming(row)),
  }), [rows]);

  async function cancel(): Promise<void> {
    const booking = cancelFor;
    if (!booking || busyId !== null) return;
    setBusyId(booking.id);
    setError(null);
    try {
      await cancelBooking(booking.id, token);
      setCancelFor(null);
      setNotice(t.bookings.cancelled);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function arrive(booking: Booking): Promise<void> {
    if (busyId !== null) return;
    setBusyId(booking.id);
    setError(null);
    try {
      await arriveBooking(booking.id, token);
      setNotice(t.bookings.checkedIn);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function payDeposit(booking: Booking): Promise<void> {
    if (busyId !== null) return;
    setBusyId(booking.id);
    setError(null);
    try {
      const checkout = await depositCheckout(booking.id, token);
      const url = checkout.checkout?.qrUrl;
      if (!url) {
        setError(t.bookings.qrMissing);
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
      setNotice(t.bookings.depositOpened);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  function card(booking: Booking) {
    const canCancel = booking.status === "REQUESTED" ||
      booking.status === "CONFIRMED";
    const canArrive = booking.status === "CONFIRMED";
    const canDeposit = booking.status === "ARRIVED" &&
      booking.depositAmount > 0 &&
      (booking.depositStatus === "DUE" || booking.depositStatus === "REQUESTED");
    return (
      <Card key={booking.id} variant="outlined">
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>{whenLabel(booking.scheduledAt)}</Typography>
            <Chip
              size="small"
              color={bookingStatusColor(booking.status)}
              label={bookingStatusLabel(booking.status, t)}
            />
          </Box>
          <Typography variant="body2">{booking.providerName}</Typography>
          <Typography variant="body2" color="text.secondary">
            {booking.arrivalMode === "TOW" ? t.bookings.towIt : t.bookings.rideIt}
          </Typography>
          {booking.serviceSnapshot && booking.serviceSnapshot.length > 0 ? (
            <Typography variant="body2">
              {booking.serviceSnapshot.map((service) => service.name).join(" · ")}
            </Typography>
          ) : null}
          {booking.note ? <Typography variant="body2" color="text.secondary">{booking.note}</Typography> : null}
          {booking.outsideHours ? <Alert severity="warning">{t.bookings.outsideHours}</Alert> : null}
          {booking.depositAmount > 0 ? (
            <Typography variant="body2">
              {`${booking.depositStatus === "DUE" || booking.depositStatus === "REQUESTED" ? t.provider.depositDue : booking.depositStatus === "WAIVED" ? t.provider.depositWaived : t.provider.depositCollected}: ${booking.depositAmount.toLocaleString()} VND`}
            </Typography>
          ) : null}
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", flexWrap: "wrap", mt: 1 }}>
            {booking.ticketId ? (
              <Button onClick={() => navigate(`/bills/${booking.ticketId}`)}>{t.bookings.openBill}</Button>
            ) : null}
            {canCancel ? (
              <Button color="error" onClick={() => setCancelFor(booking)} disabled={busyId !== null}>
                {t.bookings.cancelBooking}
              </Button>
            ) : null}
            {canDeposit ? (
              <Button onClick={() => void payDeposit(booking)} disabled={busyId !== null}>
                {t.bookings.payDeposit}
              </Button>
            ) : null}
            {canArrive ? (
              <Button variant="contained" onClick={() => void arrive(booking)} disabled={busyId !== null}>
                {t.bookings.imHere}
              </Button>
            ) : null}
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
      {error ? <Alert severity="error" onClose={() => setError(null)}>{error}</Alert> : null}
      {notice ? <Alert severity="success" onClose={() => setNotice(null)}>{notice}</Alert> : null}
      {loading && rows.length === 0 ? <LinearProgress /> : null}
      {!loading && rows.length === 0 ? <Alert severity="info">{t.bookings.none}</Alert> : null}
      {groups.upcoming.length > 0 ? (
        <>
          <Typography variant="overline" color="text.secondary">{t.bookings.upcoming}</Typography>
          {groups.upcoming.map(card)}
        </>
      ) : null}
      {groups.past.length > 0 ? (
        <>
          <Typography variant="overline" color="text.secondary" sx={{ mt: 1 }}>{t.bookings.past}</Typography>
          {groups.past.map(card)}
        </>
      ) : null}
      <ConfirmDialog
        open={cancelFor !== null}
        title={t.bookings.cancelPrompt}
        message={cancelFor ? whenLabel(cancelFor.scheduledAt) : ""}
        confirmLabel={t.bookings.cancelBooking}
        cancelLabel={t.common.cancel}
        danger
        busy={busyId !== null}
        error={error}
        onClose={() => setCancelFor(null)}
        onConfirm={() => void cancel()}
      />
    </Box>
  );
}
