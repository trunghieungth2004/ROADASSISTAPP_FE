import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import { toMessage } from "../../api/client";
import {
  collectBookingDeposit,
  completeBooking,
  requestBookingDeposit,
  respondBooking,
  shopBookings,
  type Booking,
} from "../../api/bookings";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Screen from "../../components/ui/Screen";
import { useStrings } from "../../context/LanguageContext";
import type { Strings } from "../../i18n";
import {
  bookingActions,
  bookingStatusColor,
  bookingStatusLabel,
} from "./actions";
import ShopSelect from "./ShopSelect";
import useMyShops from "./useMyShops";

function whenLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function BookingCard({
  t,
  booking,
  busy,
  onAccept,
  onDecline,
  onComplete,
  onRequestDeposit,
  onCollectDeposit,
  onWaiveDeposit,
}: {
  t: Strings;
  booking: Booking;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onComplete: () => void;
  onRequestDeposit: () => void;
  onCollectDeposit: () => void;
  onWaiveDeposit: () => void;
}) {
  const actions = bookingActions(
    booking.status,
    booking.depositStatus,
    booking.depositAmount,
  );
  const depositLabel = booking.depositStatus === "DUE" ||
    booking.depositStatus === "REQUESTED" ?
    t.provider.depositDue :
    booking.depositStatus === "NONE" || booking.depositStatus === "WAIVED" ?
      t.provider.depositWaived :
      t.provider.depositCollected;
  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>{whenLabel(booking.scheduledAt)}</Typography>
          <Chip
            size="small"
            color={bookingStatusColor(booking.status)}
            label={bookingStatusLabel(booking.status, t)}
          />
        </Box>
        <Typography variant="body2">
          {[t.bookings.rideIt, t.bookings.towIt][booking.arrivalMode === "TOW" ? 1 : 0]}
        </Typography>
        {booking.serviceSnapshot && booking.serviceSnapshot.length > 0 ? (
          <Typography variant="body2">
            {booking.serviceSnapshot.map((service) => service.name).join(" · ")}
          </Typography>
        ) : null}
        {booking.note ? (
          <Typography variant="body2" color="text.secondary">{booking.note}</Typography>
        ) : null}
        {booking.outsideHours ? (
          <Alert severity="warning">{t.bookings.outsideHours}</Alert>
        ) : null}
        {booking.depositAmount > 0 ? (
          <Typography variant="body2">
            {`${depositLabel}: ${booking.depositAmount.toLocaleString()} VND`}
          </Typography>
        ) : null}
        {actions.length > 0 ? (
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", flexWrap: "wrap", mt: 1 }}>
            {actions.includes("decline") ? (
              <Button color="error" onClick={onDecline} disabled={busy}>
                {t.bookings.decline}
              </Button>
            ) : null}
            {actions.includes("accept") ? (
              <Button variant="contained" onClick={onAccept} disabled={busy}>
                {t.bookings.accept}
              </Button>
            ) : null}
            {actions.includes("requestDeposit") ? (
              <Button onClick={onRequestDeposit} disabled={busy}>{t.provider.depositRequest}</Button>
            ) : null}
            {actions.includes("collectDeposit") ? (
              <Button onClick={onCollectDeposit} disabled={busy}>{t.provider.depositCollect}</Button>
            ) : null}
            {actions.includes("waiveDeposit") ? (
              <Button onClick={onWaiveDeposit} disabled={busy}>{t.provider.depositWaiveAction}</Button>
            ) : null}
            {actions.includes("complete") ? (
              <Button variant="contained" color="success" onClick={onComplete} disabled={busy}>
                {t.bookings.complete}
              </Button>
            ) : null}
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
}

function BookingSection({
  title,
  rows,
  render,
}: {
  title: string;
  rows: Booking[];
  render: (booking: Booking) => ReactNode;
}) {
  if (rows.length === 0) return null;
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="overline" color="text.secondary">{title}</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 0.5 }}>
        {rows.map(render)}
      </Box>
    </Box>
  );
}

export default function ProviderBookingsScreen() {
  const { t } = useStrings();
  const navigate = useNavigate();
  const { token, shops, shopId, setShopId, loading: shopsLoading, error: shopsError } = useMyShops();
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declineFor, setDeclineFor] = useState<Booking | null>(null);
  const [completeFor, setCompleteFor] = useState<Booking | null>(null);

  const load = useCallback(async () => {
    if (!token || !shopId) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await shopBookings(shopId, token);
      setRows(result.bookings);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token, shopId]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => ({
    pending: rows.filter((row) => row.status === "REQUESTED"),
    confirmed: rows.filter((row) =>
      row.status === "CONFIRMED" || row.status === "ARRIVED"),
    past: rows.filter((row) =>
      row.status === "COMPLETED" ||
      row.status === "DECLINED" ||
      row.status === "CANCELLED" ||
      row.status === "NO_SHOW"),
  }), [rows]);

  async function accept(booking: Booking): Promise<void> {
    if (!token || busyId !== null) return;
    setBusyId(booking.id);
    setError(null);
    try {
      await respondBooking(booking.id, true, token);
      setNotice(t.provider.bookingAccepted);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function decline(): Promise<void> {
    const booking = declineFor;
    if (!booking || !token || busyId !== null) return;
    setBusyId(booking.id);
    setError(null);
    try {
      await respondBooking(booking.id, false, token);
      setDeclineFor(null);
      setNotice(t.provider.bookingDeclined);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function complete(): Promise<void> {
    const booking = completeFor;
    if (!booking || !token || busyId !== null) return;
    setBusyId(booking.id);
    setError(null);
    try {
      await completeBooking(booking.id, token);
      setCompleteFor(null);
      setNotice(t.provider.bookingCompleted);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function deposit(booking: Booking, collected: boolean): Promise<void> {
    if (!token || busyId !== null) return;
    setBusyId(booking.id);
    setError(null);
    try {
      await collectBookingDeposit(booking.id, collected, token);
      setNotice(collected ? t.provider.depositCollected : t.provider.depositWaived);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function requestDeposit(booking: Booking): Promise<void> {
    if (!token || busyId !== null) return;
    setBusyId(booking.id);
    setError(null);
    try {
      await requestBookingDeposit(booking.id, token);
      setNotice(t.provider.depositRequested);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  function card(booking: Booking) {
    return (
      <BookingCard
        key={booking.id}
        t={t}
        booking={booking}
        busy={busyId === booking.id}
        onAccept={() => void accept(booking)}
        onDecline={() => {
          setError(null);
          setDeclineFor(booking);
        }}
        onComplete={() => {
          setError(null);
          setCompleteFor(booking);
        }}
        onRequestDeposit={() => void requestDeposit(booking)}
        onCollectDeposit={() => void deposit(booking, true)}
        onWaiveDeposit={() => void deposit(booking, false)}
      />
    );
  }

  return (
    <Screen maxWidth="lg">
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/more")}>
        {t.common.back}
      </Button>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">{t.provider.shopBookings}</Typography>
          <Typography variant="body2" color="text.secondary">{t.provider.shopBookingsHint}</Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} onClick={() => void load()} disabled={loading || !shopId}>
          {t.provider.refresh}
        </Button>
      </Box>
      <ShopSelect shops={shops} shopId={shopId} t={t} onChange={setShopId} />
      {shopsError ? <Alert severity="error" sx={{ mt: 2 }}>{shopsError}</Alert> : null}
      {!shopsLoading && shops.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>{t.provider.noShop}</Alert>
      ) : null}
      {error ? <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mt: 2 }} onClose={() => setNotice(null)}>{notice}</Alert> : null}
      {shopsLoading || loading ? <LinearProgress sx={{ mt: 2 }} /> : null}
      {!loading && shops.length > 0 && rows.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>{t.provider.noShopBookings}</Alert>
      ) : null}
      <BookingSection title={t.provider.pendingBookings} rows={groups.pending} render={card} />
      <BookingSection title={t.provider.confirmedBookings} rows={groups.confirmed} render={card} />
      <BookingSection title={t.provider.pastBookings} rows={groups.past} render={card} />

      <ConfirmDialog
        open={declineFor !== null}
        title={t.provider.declineBookingTitle}
        message={declineFor ? whenLabel(declineFor.scheduledAt) : ""}
        confirmLabel={t.bookings.decline}
        cancelLabel={t.common.cancel}
        danger
        busy={busyId !== null}
        error={error}
        onClose={() => setDeclineFor(null)}
        onConfirm={() => void decline()}
      />
      <ConfirmDialog
        open={completeFor !== null}
        title={t.provider.completeBookingTitle}
        message={completeFor ? whenLabel(completeFor.scheduledAt) : ""}
        confirmLabel={t.bookings.complete}
        cancelLabel={t.common.cancel}
        busy={busyId !== null}
        error={error}
        onClose={() => setCompleteFor(null)}
        onConfirm={() => void complete()}
      />
    </Screen>
  );
}
