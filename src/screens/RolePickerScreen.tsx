import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Container from "@mui/material/Container";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import StoreIcon from "@mui/icons-material/Store";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import VolunteerIcon from "@mui/icons-material/VolunteerActivism";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import { toMessage } from "../api/client";
import { reverseGeocode, type Place } from "../api/places";
import {
  createShop,
  updateShop,
  type ShopType,
  type TowVehicleType,
} from "../api/shops";
import {
  setVolunteer,
  volunteerHeartbeat,
  type VolunteerCapability,
} from "../api/users";
import PlaceField from "../components/PlaceField";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { useStrings } from "../context/LanguageContext";
import { shopTypeLabel, towVehicleLabel } from "../i18n/labels";
import { usePlaceSearch } from "../hooks/usePlaceSearch";
import {
  addMyShop,
  getMyShops,
  setMyShopAccepting,
  type MyShop,
} from "../storage/myShops";

type Role = "RIDER" | "SHOP" | "MOBILE" | "TOW" | "VOLUNTEER";

const TOW_VEHICLES: TowVehicleType[] = ["CAR", "VAN", "TRUCK"];
const TOW_WIDTHS: Record<TowVehicleType, string> = {
  CAR: "1.9",
  VAN: "2.0",
  TRUCK: "2.3",
};

export default function RolePickerScreen() {
  const { t, lang } = useStrings();
  const { token } = useAuth();
  const { hasVehicle, markOnboarded } = useProfile();
  const navigate = useNavigate();
  const search = usePlaceSearch(lang);
  const [role, setRole] = useState<Role>("RIDER");
  const [name, setName] = useState("");
  const [hours, setHours] = useState("");
  const [hasTow, setHasTow] = useState(false);
  const [towVehicle, setTowVehicle] = useState<TowVehicleType>("CAR");
  const [towWidth, setTowWidth] = useState(TOW_WIDTHS.CAR);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [capability, setCapability] =
    useState<VolunteerCapability>("SOLO_BIKE");
  const [shops, setShops] = useState<MyShop[]>(() => getMyShops());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function onPickPlace(place: Place | null) {
    if (!place) {
      return;
    }
    setLat(place.lat);
    setLng(place.lng);
  }

  async function onGps() {
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 8000,
          }),
      );
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
      const hit = await reverseGeocode(
        pos.coords.latitude,
        pos.coords.longitude,
        lang,
      );
      if (hit) {
        search.pin(hit.label);
      }
    } catch (err) {
      setError(toMessage(err));
    }
  }

  function done() {
    void finish("RIDER");
  }

  async function finish(nextRole: string) {
    setBusy(true);
    setError(null);
    try {
      await markOnboarded(nextRole);
      navigate(hasVehicle ? "/" : "/vehicle");
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onRegister() {
    if (!token || !name.trim() || lat === null || lng === null) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const shopType = role as ShopType;
      const created = await createShop(
        {
          name: name.trim(),
          lat,
          lng,
          type: shopType,
          openHours: hours.trim() || undefined,
          hasTow: role === "TOW" ? true : hasTow,
          towVehicleType: role === "TOW" ? towVehicle : undefined,
          towVehicleWidth:
            role === "TOW" ? Number(towWidth) || undefined : undefined,
        },
        token,
      );
      setShops(
        addMyShop({
          id: created.id,
          name: created.name,
          type: created.type,
          accepting: created.accepting,
        }),
      );
      await markOnboarded(shopType);
      if (!hasVehicle) {
        navigate("/vehicle");
        return;
      }
      setNotice(t.roles.registered);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onVolunteer() {
    if (!token) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await setVolunteer({available: true, capability}, token);
      const pos = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 8000,
          }),
      );
      await volunteerHeartbeat(
        {lat: pos.coords.latitude, lng: pos.coords.longitude},
        token,
      );
      await markOnboarded("VOLUNTEER");
      if (!hasVehicle) {
        navigate("/vehicle");
        return;
      }
      setNotice(t.roles.registered);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onToggleShop(shop: MyShop, next: boolean) {
    if (!token) {
      return;
    }
    setError(null);
    try {
      await updateShop({shopId: shop.id, accepting: next}, token);
      setShops(setMyShopAccepting(shop.id, next));
    } catch (err) {
      setError(toMessage(err));
    }
  }

  const roleCards: Array<{
    value: Role;
    title: string;
    hint: string;
    icon: ReactNode;
  }> = [
    {
      value: "RIDER",
      title: t.roles.rider,
      hint: t.roles.riderHint,
      icon: <TwoWheelerIcon color="primary" />,
    },
    {
      value: "SHOP",
      title: t.roles.shop,
      hint: t.roles.shopHint,
      icon: <StoreIcon color="primary" />,
    },
    {
      value: "MOBILE",
      title: t.roles.mobile,
      hint: t.roles.mobileHint,
      icon: <DirectionsCarIcon color="primary" />,
    },
    {
      value: "TOW",
      title: t.roles.tow,
      hint: t.roles.towHint,
      icon: <LocalShippingIcon color="primary" />,
    },
    {
      value: "VOLUNTEER",
      title: t.roles.volunteer,
      hint: t.roles.volunteerHint,
      icon: <VolunteerIcon color="primary" />,
    },
  ];
  const business = role === "SHOP" || role === "MOBILE" || role === "TOW";

  return (
    <Container maxWidth="sm" sx={{ py: 2, overflowY: "auto", height: "100%" }}>
      <Typography variant="h6">{t.roles.title}</Typography>
      <Typography variant="body2" color="text.secondary">
        {t.roles.subtitle}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mt: 1 }}>
          {notice}
        </Alert>
      )}
      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        <Card>
          <CardContent
            sx={{ display: "flex", flexDirection: "column", gap: 1 }}
          >
            {roleCards.map((c) => (
              <Button
                key={c.value}
                variant={role === c.value ? "contained" : "outlined"}
                startIcon={c.icon}
                onClick={() => setRole(c.value)}
                sx={{ justifyContent: "flex-start" }}
              >
                {c.title} — {c.hint}
              </Button>
            ))}
          </CardContent>
        </Card>
        {role === "RIDER" && (
          <Button variant="contained" onClick={done}>
            {t.roles.rider}
          </Button>
        )}
        {business && (
          <Card>
            <CardContent
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                label={t.roles.name}
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
              />
              <TextField
                label={t.roles.hours}
                helperText={t.roles.hoursHint}
                placeholder="06:00-22:00"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                fullWidth
              />
              {role !== "TOW" && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={hasTow}
                      onChange={(e) => setHasTow(e.target.checked)}
                    />
                  }
                  label={t.roles.hasTow}
                />
              )}
              {role === "TOW" && (
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    select
                    label={t.roles.towVehicle}
                    value={towVehicle}
                    onChange={(e) => {
                      const next = e.target.value as TowVehicleType;
                      setTowVehicle(next);
                      setTowWidth(TOW_WIDTHS[next]);
                    }}
                    fullWidth
                  >
                    {TOW_VEHICLES.map((v) => (
                      <MenuItem key={v} value={v}>
                        {towVehicleLabel(v, t)}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label={t.roles.towWidth}
                    type="number"
                    slotProps={{ htmlInput: { step: "0.1", min: "0.3" } }}
                    value={towWidth}
                    onChange={(e) => setTowWidth(e.target.value)}
                    fullWidth
                  />
                </Box>
              )}
              <PlaceField
                point="B"
                title={t.route.destination}
                placeholder={t.route.searchDestination}
                search={search}
                onSelect={onPickPlace}
                searchingText={t.route.searching}
                noResultsText={t.route.noResults}
                emptyHint={t.route.tapToSet}
                pickActive={false}
                pickLabel={t.route.pickOnMap}
                onPickMap={() => undefined}
                savedHeader={t.route.savedPlaces}
                directoryHeader={t.route.directory}
                mapHeader={t.route.mapResults}
                savedCoords={new Set<string>()}
                saveTitle={t.route.savePlace}
                canSavePin={false}
              />
              <Button variant="outlined" onClick={() => void onGps()}>
                {t.dispatch.useLocation}
              </Button>
              {lat !== null && lng !== null && (
                <Typography variant="caption" color="text.secondary">
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </Typography>
              )}
              <Button
                variant="contained"
                disabled={busy || !name.trim() || lat === null}
                onClick={() => void onRegister()}
              >
                {t.roles.register}
              </Button>
            </CardContent>
          </Card>
        )}
        {role === "VOLUNTEER" && (
          <Card>
            <CardContent
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                select
                label={t.roles.volunteer}
                value={capability}
                onChange={(e) =>
                  setCapability(e.target.value as VolunteerCapability)
                }
                fullWidth
              >
                <MenuItem value="SOLO_BIKE">{t.roles.bikeOnly}</MenuItem>
                <MenuItem value="CAR">{t.roles.carCapable}</MenuItem>
              </TextField>
              <Button
                variant="contained"
                disabled={busy}
                onClick={() => void onVolunteer()}
              >
                {t.roles.register}
              </Button>
            </CardContent>
          </Card>
        )}
        {shops.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1">
                {t.dispatch.myShops}
              </Typography>
              {shops.map((s) => (
                <Box
                  key={s.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    mt: 1,
                  }}
                >
                  <Box>
                    <Typography variant="body2">{s.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {shopTypeLabel(s.type, t)} ·{" "}
                      {s.accepting === false
                        ? t.dispatch.paused
                        : t.dispatch.accepting}
                    </Typography>
                  </Box>
                  <Switch
                    checked={s.accepting !== false}
                    onChange={(_, on) => void onToggleShop(s, on)}
                    edge="end"
                    slotProps={{ input: { "aria-label": s.name } }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        )}
        <Button variant="text" onClick={() => void finish(role)}>
          {t.roles.skip}
        </Button>
      </Box>
    </Container>
  );
}
