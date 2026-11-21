import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import { createTicket } from "../../api/dispatch";
import { nearProviders, type Provider } from "../../api/providers";
import type { MeVehicle } from "../../api/users";
import type { Strings } from "../../i18n";

function vehicleTypeOf(type: string | undefined): "BIKE" | "CAR" {
  return type === "CAR" ? "CAR" : "BIKE";
}

export default function AssistRequestForm({
  t,
  token,
  point,
  locationError,
  activeVehicle,
  onCreated,
}: {
  t: Strings;
  token: string;
  point: { lat: number; lng: number } | null;
  locationError: string | null;
  activeVehicle: MeVehicle | null;
  onCreated: () => void;
}) {
  const [description, setDescription] = useState("");
  const [shops, setShops] = useState<Provider[]>([]);
  const [shopId, setShopId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const ticketType = "WALK_IN";
  const needsShop = true;
  const needsVehicle = false;

  useEffect(() => {
    if (!point || !token || !needsShop) {
      setShops([]);
      setShopId("");
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    void nearProviders(point.lat, point.lng, token, {
      kind: "SHOP",
      radiusMeters: 20000,
      limit: 20,
      acceptingOnly: true,
      ...(activeVehicle?.type === "CAR"
        ? { vehicleClass: "CAR" as const }
        : { vehicleClass: "SOLO_BIKE" as const }),
    }).then((rows) => {
      if (!alive) return;
      const usable = rows.filter((row) =>
        row.status === "ACTIVE" &&
        row.suspended !== true &&
        row.kind === "SHOP" &&
        row.accepting === true &&
        (row.services ?? []).some((service) =>
          service.channels?.includes("ASSIST")));
      setShops(usable);
      setShopId((current) =>
        usable.some((row) => row.id === current) ? current : usable[0]?.id ?? "");
    }).catch((err) => {
      if (alive) setError(toMessage(err));
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [point, token, needsShop, ticketType]);

  async function submit(): Promise<void> {
    if (!point) {
      setError(t.assist.noLocation);
      return;
    }
    if (needsVehicle && !activeVehicle) {
      setError(t.assist.vehicleRequired);
      return;
    }
    if (needsShop && shopId === "") {
      setError(t.assist.noShop);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createTicket({
        ticketType,
        lat: point.lat,
        lng: point.lng,
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(activeVehicle ? {
          vehicleId: activeVehicle.id,
          vehicleType: vehicleTypeOf(activeVehicle.type),
          vehicleWidth: activeVehicle.baseWidth,
        } : {}),
        providerId: shopId,
      }, token);
      setDescription("");
      setNotice(t.assist.requestSent);
      onCreated();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {error ? <Alert severity="error" onClose={() => setError(null)}>{error}</Alert> : null}
        {notice ? <Alert severity="success" onClose={() => setNotice(null)}>{notice}</Alert> : null}
        {locationError ? <Alert severity="warning">{locationError}</Alert> : null}
        {needsVehicle && !activeVehicle ? (
          <Alert severity="warning">{t.assist.vehicleRequired}</Alert>
        ) : null}
        <Typography variant="body2" color="text.secondary">
          {point ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : t.assist.noLocation}
        </Typography>
        {needsShop ? (
          <TextField
            select
            label={t.assist.shop}
            value={shopId}
            onChange={(event) => setShopId(event.target.value)}
            disabled={loading || shops.length === 0}
          >
            {shops.map((shop) => (
              <MenuItem key={shop.id} value={shop.id}>
                {shop.name}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        {needsShop && !loading && shops.length === 0 ? (
          <Alert severity="info">{t.assist.noShop}</Alert>
        ) : null}
        <TextField
          label={t.assist.description}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          multiline
          minRows={3}
          placeholder={t.assist.descriptionHint}
        />
        <Button
          variant="contained"
          onClick={() => void submit()}
          disabled={busy || !point || (needsVehicle && !activeVehicle)}
          sx={{ alignSelf: "flex-end" }}
        >
          {t.assist.requestHelp}
        </Button>
      </CardContent>
    </Card>
  );
}
