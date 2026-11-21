import { useCallback, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import { toMessage } from "../api/client";
import type { Booking } from "../api/bookings";
import { nearProviders, searchProviders, type Provider } from "../api/providers";
import Screen from "../components/ui/Screen";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { useStrings } from "../context/LanguageContext";
import BookingComposer from "./booking/BookingComposer";
import MyBookingsPanel from "./booking/MyBookingsPanel";

function locationLabel(provider: Provider): string {
  return [provider.label, provider.openHours].filter(Boolean).join(" · ");
}

export default function BookingScreen() {
  const { t } = useStrings();
  const { token } = useAuth();
  const { activeVehicle } = useProfile();
  const [tab, setTab] = useState<"book" | "mine">("book");
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [shops, setShops] = useState<Provider[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedShop, setSelectedShop] = useState<Provider | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError(t.bookings.locationUnavailable);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPoint({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationError(null);
      },
      () => setLocationError(t.bookings.locationUnavailable),
      { timeout: 10000 },
    );
  }, [t.bookings.locationUnavailable]);

  const loadShops = useCallback(async (search: string) => {
    if (!token || !point) return;
    setLoading(true);
    setError(null);
    try {
      const rows = search.trim() === "" ?
        await nearProviders(point.lat, point.lng, token, {
          kind: "SHOP",
          radiusMeters: 20000,
          limit: 20,
          acceptingOnly: true,
          ...(activeVehicle?.type === "CAR"
            ? { vehicleClass: "CAR" as const }
            : { vehicleClass: "SOLO_BIKE" as const }),
        }) :
        await searchProviders(point.lat, point.lng, search.trim(), token, {
          kind: "SHOP",
          limit: 20,
          acceptingOnly: true,
          ...(activeVehicle?.type === "CAR"
            ? { vehicleClass: "CAR" as const }
            : { vehicleClass: "SOLO_BIKE" as const }),
        });
      setShops(rows.filter((provider) =>
        provider.kind === "SHOP" &&
        provider.status === "ACTIVE" &&
        provider.suspended !== true &&
        provider.bookingEnabled === true));
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token, point]);

  useEffect(() => {
    if (point) void loadShops("");
  }, [point, loadShops]);

  function onCreated(booking: Booking): void {
    setSelectedShop(null);
    setRefreshKey((value) => value + 1);
    setTab("mine");
    setNotice(t.bookings.created.replace("{shop}", booking.providerName));
  }

  return (
    <Screen maxWidth="lg">
      <Typography variant="h5">{t.bookings.title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {t.bookings.screenHint}
      </Typography>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={tab}
        onChange={(_, value: "book" | "mine" | null) => {
          if (value !== null) setTab(value);
        }}
        sx={{ mt: 2 }}
      >
        <ToggleButton value="book">{t.bookings.book}</ToggleButton>
        <ToggleButton value="mine">{t.bookings.myBookings}</ToggleButton>
      </ToggleButtonGroup>

      {notice ? <Alert severity="success" sx={{ mt: 2 }} onClose={() => setNotice(null)}>{notice}</Alert> : null}
      {error ? <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>{error}</Alert> : null}
      {locationError ? <Alert severity="warning" sx={{ mt: 2 }}>{locationError}</Alert> : null}
      {!activeVehicle ? <Alert severity="warning" sx={{ mt: 2 }}>{t.bookings.noVehicle}</Alert> : null}

      {tab === "book" ? (
        <>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 2 }}>
            <TextField
              size="small"
              fullWidth
              label={t.bookings.searchShops}
              placeholder={t.bookings.searchHint}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void loadShops(query);
              }}
            />
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={() => void loadShops(query)}
              disabled={loading || !point}
            >
              {t.bookings.find}
            </Button>
          </Box>
          {loading ? <Alert severity="info" sx={{ mt: 2 }}>{t.common.loading}</Alert> : null}
          {!loading && point && shops.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>{t.bookings.noShops}</Alert>
          ) : null}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 2 }}>
            {shops.map((shop) => (
              <Card key={shop.id} variant="outlined">
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                  <Typography sx={{ fontWeight: 700 }}>{shop.name}</Typography>
                  {locationLabel(shop) ? (
                    <Typography variant="body2" color="text.secondary">{locationLabel(shop)}</Typography>
                  ) : null}
                  <Typography variant="body2" color="text.secondary">
                    {[
                      shop.ratingCount && shop.ratingAvg !== undefined ?
                        `★ ${shop.ratingAvg.toFixed(1)} (${shop.ratingCount})` :
                        null,
                      shop.openNow === true ? t.bookings.openNow :
                        shop.openNow === false ? t.bookings.closedNow : null,
                    ].filter(Boolean).join(" · ")}
                  </Typography>
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.5 }}>
                    <Button
                      variant="contained"
                      disabled={!activeVehicle}
                      onClick={() => setSelectedShop(shop)}
                    >
                      {t.bookings.book}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </>
      ) : (
        <MyBookingsPanel t={t} token={token ?? ""} refreshKey={refreshKey} />
      )}

      {selectedShop && token ? (
        <BookingComposer
          t={t}
          token={token}
          shop={selectedShop}
          point={point}
          activeVehicle={activeVehicle}
          onClose={() => setSelectedShop(null)}
          onCreated={onCreated}
        />
      ) : null}
    </Screen>
  );
}
