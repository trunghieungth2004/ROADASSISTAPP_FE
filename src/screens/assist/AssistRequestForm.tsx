import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import { createTicket } from "../../api/dispatch";
import { nearProviders, type Provider } from "../../api/providers";
import type { MeVehicle } from "../../api/users";
import type { Strings } from "../../i18n";

type TicketType = "SOS" | "TOW" | "WALK_IN" | "MECHANIC";

const SYMPTOMS = [
  "FLAT_TIRE",
  "FLUID_LEAK",
  "CHAIN_SLACK",
  "SPARK_CAP",
  "ELECTRICAL",
  "ENGINE",
  "BRAKES",
  "OTHER",
];

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
  const [ticketType, setTicketType] = useState<TicketType>("SOS");
  const [symptom, setSymptom] = useState("FLAT_TIRE");
  const [description, setDescription] = useState("");
  const [shops, setShops] = useState<Provider[]>([]);
  const [shopId, setShopId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isCar = activeVehicle?.type === "CAR";
  const needsShop = ticketType === "WALK_IN" || ticketType === "TOW";
  const needsVehicle = ticketType !== "WALK_IN";
  const availableTypes = useMemo(() => {
    const types: TicketType[] = ["SOS", "TOW"];
    if (!isCar) types.push("WALK_IN", "MECHANIC");
    return types;
  }, [isCar]);

  useEffect(() => {
    if (!availableTypes.includes(ticketType)) {
      setTicketType("SOS");
    }
  }, [availableTypes, ticketType]);

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
      radiusMeters: 30000,
      limit: 50,
    }).then((rows) => {
      if (!alive) return;
      const usable = rows.filter((row) =>
        row.status === "ACTIVE" &&
        row.suspended !== true &&
        (ticketType !== "WALK_IN" || row.accepting !== false));
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
        ...(ticketType === "SOS" || ticketType === "MECHANIC" ?
          { symptom } :
          {}),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(activeVehicle ? {
          vehicleId: activeVehicle.id,
          vehicleType: vehicleTypeOf(activeVehicle.type),
          vehicleWidth: activeVehicle.baseWidth,
        } : {}),
        ...(ticketType === "WALK_IN" && shopId !== "" ? { providerId: shopId } : {}),
        ...(ticketType === "TOW" && shopId !== "" ? { destinationShopId: shopId } : {}),
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
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t.assist.requestType}</Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={ticketType}
            onChange={(_, value: TicketType | null) => {
              if (value !== null) setTicketType(value);
            }}
          >
            {availableTypes.map((type) => (
              <ToggleButton key={type} value={type}>
                {type === "SOS" ? t.assist.typeSos :
                  type === "TOW" ? t.assist.typeTow :
                    type === "WALK_IN" ? t.assist.typeWalkIn :
                      t.assist.typeMechanic}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {point ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : t.assist.noLocation}
        </Typography>
        {ticketType === "SOS" || ticketType === "MECHANIC" ? (
          <TextField
            select
            label={t.assist.symptom}
            value={symptom}
            onChange={(event) => setSymptom(event.target.value)}
          >
            {SYMPTOMS.map((code) => (
              <MenuItem key={code} value={code}>
                {(t.provider.categories as Record<string, string>)[code] ?? code}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        {needsShop ? (
          <TextField
            select
            label={ticketType === "TOW" ? t.assist.destinationShop : t.assist.shop}
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
