import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Screen from "../components/ui/Screen";
import BuildIcon from "@mui/icons-material/Build";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import { toMessage } from "../api/client";
import { placeKey, type Place } from "../api/places";
import { createMobileShopProvider, createShopProvider, createTowProvider } from "../api/providers";
import { usePlaceSearch } from "../hooks/usePlaceSearch";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { useStrings } from "../context/LanguageContext";

const TOW_TYPES = ["CAR", "VAN", "TRUCK"];

const PLATE_SHAPE = /^\d{2}[A-Z0-9]{1,3}\d{4,6}$/;

function normalizePlate(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function readGps(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 10000 },
    );
  });
}

export default function RolePickerScreen() {
  const { t, lang } = useStrings();
  const { token } = useAuth();
  const { markOnboarded } = useProfile();
  const navigate = useNavigate();
  const search = usePlaceSearch(lang);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopName, setShopName] = useState("");
  const [shopPoint, setShopPoint] = useState<Place | null>(null);
  const [towOpen, setTowOpen] = useState(false);
  const [towName, setTowName] = useState("");
  const [plate, setPlate] = useState("");
  const [towType, setTowType] = useState("VAN");
  const [width, setWidth] = useState("");
  const [towPoint, setTowPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileName, setMobileName] = useState("");
  const [mobilePlate, setMobilePlate] = useState("");
  const [mobileType, setMobileType] = useState("CAR");
  const [mobileLicense, setMobileLicense] = useState("");
  const [mobilePoint, setMobilePoint] = useState<{ lat: number; lng: number } | null>(null);

  async function useGps(into: (p: { lat: number; lng: number }) => void) {
    setError(null);
    try {
      into(await readGps());
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function finish() {
    if (!token) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (shopOpen) {
        if (!shopName.trim()) {
          throw new Error(t.provider.invalidName);
        }
        if (!shopPoint) {
          throw new Error(t.provider.invalidLocation);
        }
      }
      let towWidth: number | undefined;
      if (towOpen) {
        if (!towName.trim()) {
          throw new Error(t.provider.invalidName);
        }
        if (!PLATE_SHAPE.test(normalizePlate(plate))) {
          throw new Error(t.tow.invalid);
        }
        const parsed = Number(width.trim().replace(",", "."));
        if (!Number.isFinite(parsed) || parsed < 0.3 || parsed > 3) {
          throw new Error(t.tow.invalid);
        }
        towWidth = Math.round(parsed * 100) / 100;
        if (!towPoint) {
          throw new Error(t.provider.invalidLocation);
        }
      }
      if (mobileOpen) {
        if (!mobileName.trim()) throw new Error(t.provider.invalidName);
        if (!PLATE_SHAPE.test(normalizePlate(mobilePlate))) throw new Error(t.tow.invalid);
        if (!mobileLicense.trim()) throw new Error(t.provider.invalidName);
        if (!mobilePoint) throw new Error(t.provider.invalidLocation);
      }
      await markOnboarded("RIDER");
      if (shopOpen && shopPoint) {
        await createShopProvider(
          {
            name: shopName.trim(),
            lat: shopPoint.lat,
            lng: shopPoint.lng,
            label: shopPoint.label,
          },
          token,
        );
      }
      if (mobileOpen && mobilePoint) {
        await createMobileShopProvider({
          name: mobileName.trim(),
          lat: mobilePoint.lat,
          lng: mobilePoint.lng,
          plate: normalizePlate(mobilePlate),
          vehicleType: mobileType,
          licenseNumber: mobileLicense.trim(),
        }, token);
      }
      if (towOpen && towPoint) {
        await createTowProvider(
          {
            name: towName.trim(),
            lat: towPoint.lat,
            lng: towPoint.lng,
            plate: normalizePlate(plate),
            vehicleType: towType,
            vehicleWidth: towWidth,
          },
          token,
        );
        setNotice(t.tow.submitted);
      }
      navigate("/");
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen maxWidth="sm">
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
            <Button
              variant="outlined"
              startIcon={<TwoWheelerIcon color="primary" />}
              aria-pressed
              sx={{
                justifyContent: "flex-start",
                color: "text.primary",
                fontWeight: 700,
                borderWidth: 2,
                borderColor: "primary.main",
                padding: "4px 14px",
              }}
            >
              {t.roles.rider} — {t.roles.riderHint}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent
            sx={{ display: "flex", flexDirection: "column", gap: 1 }}
          >
            <Button
              variant={shopOpen ? "contained" : "outlined"}
              startIcon={
                <StorefrontIcon color={shopOpen ? "inherit" : "primary"} />
              }
              aria-pressed={shopOpen}
              disabled={busy}
              onClick={() => setShopOpen((v) => !v)}
              sx={{ justifyContent: "flex-start", padding: "4px 14px" }}
            >
              {t.roles.shop} — {t.roles.shopHint}
            </Button>
            {shopOpen && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <TextField
                  size="small"
                  label={t.provider.name}
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  fullWidth
                />
                <Autocomplete
                  size="small"
                  options={search.options}
                  getOptionLabel={(o) => o.label}
                  filterOptions={(x) => x}
                  inputValue={search.input}
                  onInputChange={(_e, v, r) => search.handleInput(v, r)}
                  onChange={(_e, v) => setShopPoint(v)}
                  loading={search.searching}
                  noOptionsText={t.route.noResults}
                  isOptionEqualToValue={(o, v) => placeKey(o) === placeKey(v)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t.provider.shopAddress}
                      fullWidth
                    />
                  )}
                />
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<MyLocationIcon />}
                  disabled={busy}
                  onClick={() =>
                    void useGps((p) =>
                      setShopPoint({
                        label: `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`,
                        lat: p.lat,
                        lng: p.lng,
                        source: "map",
                      }),
                    )
                  }
                >
                  {t.provider.useLocation}
                </Button>
              </Box>
            )}
            <Button
              variant={towOpen ? "contained" : "outlined"}
              startIcon={
                <LocalShippingIcon color={towOpen ? "inherit" : "primary"} />
              }
              aria-pressed={towOpen}
              disabled={busy}
              onClick={() => setTowOpen((v) => !v)}
              sx={{ justifyContent: "flex-start", padding: "4px 14px" }}
            >
              {t.roles.tow} — {t.roles.towHint}
            </Button>
            {towOpen && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography variant="subtitle2">{t.tow.register}</Typography>
                <TextField
                  size="small"
                  label={t.provider.name}
                  value={towName}
                  onChange={(e) => setTowName(e.target.value)}
                  fullWidth
                />
                <TextField
                  size="small"
                  label={t.tow.plate}
                  placeholder={t.tow.platePlaceholder}
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  fullWidth
                />
                <TextField
                  select
                  size="small"
                  value={towType}
                  onChange={(e) => setTowType(e.target.value)}
                  fullWidth
                >
                  {TOW_TYPES.map((id) => (
                    <MenuItem key={id} value={id}>
                      {id}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  label={t.vehicle.widthMeters}
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  fullWidth
                />
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<MyLocationIcon />}
                  disabled={busy}
                  onClick={() => void useGps((p) => setTowPoint(p))}
                >
                  {t.provider.useLocation}
                </Button>
                <Typography variant="caption" color="text.secondary">
                  {towPoint
                    ? t.provider.towPositionSet
                    : t.provider.towPositionUnset}
                </Typography>
              </Box>
            )}
            <Button
              variant={mobileOpen ? "contained" : "outlined"}
              startIcon={<BuildIcon color={mobileOpen ? "inherit" : "primary"} />}
              aria-pressed={mobileOpen}
              disabled={busy}
              onClick={() => setMobileOpen((v) => !v)}
              sx={{ justifyContent: "flex-start", padding: "4px 14px" }}
            >
              {t.roles.mobileShop} — {t.roles.mobileShopHint}
            </Button>
            {mobileOpen && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <TextField size="small" label={t.provider.name} value={mobileName} onChange={(e) => setMobileName(e.target.value)} fullWidth />
                <TextField size="small" label={t.tow.plate} value={mobilePlate} onChange={(e) => setMobilePlate(e.target.value)} fullWidth />
                <TextField select size="small" value={mobileType} onChange={(e) => setMobileType(e.target.value)} fullWidth>
                  {TOW_TYPES.map((id) => <MenuItem key={id} value={id}>{id}</MenuItem>)}
                </TextField>
                <TextField size="small" label={t.provider.license} value={mobileLicense} onChange={(e) => setMobileLicense(e.target.value)} fullWidth />
                <Button size="small" variant="outlined" startIcon={<MyLocationIcon />} disabled={busy} onClick={() => void useGps((p) => setMobilePoint(p))}>
                  {t.provider.useLocation}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
        <Button variant="contained" disabled={busy} onClick={() => void finish()}>
          {t.roles.rider}
        </Button>
        <Button variant="text" disabled={busy} onClick={() => void finish()}>
          {t.roles.skip}
        </Button>
      </Box>
    </Screen>
  );
}
