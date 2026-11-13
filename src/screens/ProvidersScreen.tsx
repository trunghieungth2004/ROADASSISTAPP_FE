import { useCallback, useEffect, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Rating from "@mui/material/Rating";
import Switch from "@mui/material/Switch";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Screen from "../components/ui/Screen";
import AddIcon from "@mui/icons-material/Add";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import { toMessage } from "../api/client";
import {
  createMobileShopProvider,
  createShopProvider,
  createTowProvider,
  fetchMyProviders,
  fetchProviderPricingLimits,
  nearProviders,
  providerRatings,
  reportProvider,
  revokeProvider,
  searchProviders,
  updateProvider,
  type Provider,
  type ProviderKind,
  type ProviderPricingLimits,
  type ProviderRating,
} from "../api/providers";
import { mapDefaults } from "../map/style";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";

type Mode = "mine" | "find";

function statusColor(status: string): "success" | "warning" | "error" | "default" {
  if (status === "ACTIVE") return "success";
  if (status === "PENDING") return "warning";
  if (status === "DENIED") return "error";
  return "default";
}

type ServiceRow = {
  code: string;
  name: string;
  price: string;
  quoteRequired: boolean;
  category: string;
  warrantyDays: string;
  warrantyParts: "LABOR_ONLY" | "PARTS_AND_LABOR";
  channels: Array<"BOOKING" | "ASSIST">;
};

const SERVICE_CATEGORY_IDS = [
  "FLAT_TIRE", "FLUID_LEAK", "CHAIN_SLACK", "SPARK_CAP",
  "ELECTRICAL", "ENGINE", "BRAKES", "OTHER",
] as const;

function serviceCodeFor(name: string, index: number): string {
  const base = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return base === "" ? `SVC_${index + 1}` : base.slice(0, 64);
}

function kindLabel(kind: string): string {
  if (kind === "TOW") return "Tow";
  if (kind === "MOBILE_SHOP") return "Mobile shop";
  return "Shop";
}

function FormSection({title}: {title: string}) {
  return (
    <>
      <Divider sx={{ mt: 1 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{title}</Typography>
    </>
  );
}

function readLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: mapDefaults.center[1], lng: mapDefaults.center[0] });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: mapDefaults.center[1], lng: mapDefaults.center[0] }),
      { timeout: 8000 },
    );
  });
}

export default function ProvidersScreen() {
  const { t } = useStrings();
  const { token } = useAuth();
  const [mode, setMode] = useState<Mode>("mine");
  const [mine, setMine] = useState<Provider[]>([]);
  const [found, setFound] = useState<Provider[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<ProviderKind | "">("");
  const [form, setForm] = useState<{ mode: "create" | "edit"; provider: Provider | null } | null>(null);
  const [reviewsFor, setReviewsFor] = useState<Provider | null>(null);
  const [reviews, setReviews] = useState<ProviderRating[]>([]);
  const [reportFor, setReportFor] = useState<Provider | null>(null);
  const [reportReason, setReportReason] = useState("INFO_INACCURATE");
  const [reportNote, setReportNote] = useState("");
  const [reportBusy, setReportBusy] = useState(false);

  const reloadMine = useCallback(async () => {
    if (!token) return;
    try {
      setMine(await fetchMyProviders(token));
    } catch (err) {
      setError(toMessage(err));
    }
  }, [token]);

  useEffect(() => {
    void reloadMine();
  }, [reloadMine]);

  async function findProviders() {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const point = await readLocation();
      const options = { ...(kind !== "" ? { kind } : {}), limit: 20 };
      const rows = query.trim().length >= 2
        ? await searchProviders(point.lat, point.lng, query.trim(), token, options)
        : await nearProviders(point.lat, point.lng, token, { ...options, radiusMeters: 10000 });
      setFound(rows);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleAccepting(provider: Provider, accepting: boolean) {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await updateProvider({ providerId: provider.id, accepting }, token);
      await reloadMine();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke(provider: Provider) {
    if (!token || !window.confirm(t.provider.revokeConfirm)) return;
    setBusy(true);
    try {
      await revokeProvider(provider.id, token);
      await reloadMine();
      setNotice(t.provider.revoked);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function openReviews(provider: Provider) {
    if (!token) return;
    setReviewsFor(provider);
    setReviews([]);
    try {
      const res = await providerRatings(provider.id, token);
      setReviews(res.ratings);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  const myCard = (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => setForm({ mode: "create", provider: null })}>
        {t.provider.add}
      </Button>
      {mine.length === 0 && <Alert severity="info">{t.provider.none}</Alert>}
      {mine.map((provider) => (
        <Card key={provider.id}>
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>{provider.name}</Typography>
              <Chip size="small" label={kindLabel(provider.kind)} />
              <Chip size="small" color={statusColor(provider.status)} label={provider.status} />
              {provider.suspended && <Chip size="small" color="error" label={t.provider.suspended} />}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {provider.label ?? `${provider.lat.toFixed(5)}, ${provider.lng.toFixed(5)}`}
            </Typography>
            {provider.openHours && <Typography variant="body2">{t.provider.hours}: {provider.openHours}</Typography>}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ flexGrow: 1 }}>{t.provider.accepting}</Typography>
              <Switch checked={provider.accepting !== false} onChange={(e) => void toggleAccepting(provider, e.target.checked)} disabled={busy || provider.status !== "ACTIVE"} />
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button size="small" onClick={() => setForm({ mode: "edit", provider })}>{t.provider.edit}</Button>
              <Button size="small" color="error" onClick={() => void onRevoke(provider)}>{t.provider.revoke}</Button>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  const findCard = (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField size="small" fullWidth label={t.provider.searchLabel} value={query} onChange={(e) => setQuery(e.target.value)} />
        <TextField select size="small" label={t.provider.kind} value={kind} onChange={(e) => setKind(e.target.value as ProviderKind | "")} sx={{ minWidth: 140 }}>
          <MenuItem value="">{t.provider.allKinds}</MenuItem>
          <MenuItem value="SHOP">Shop</MenuItem>
          <MenuItem value="TOW">Tow</MenuItem>
          <MenuItem value="MOBILE_SHOP">Mobile shop</MenuItem>
        </TextField>
        <Button variant="contained" onClick={() => void findProviders()} disabled={busy}>{t.provider.find}</Button>
      </Box>
      {found.length === 0 && <Alert severity="info">{t.provider.noResults}</Alert>}
      {found.map((provider) => (
        <Card key={provider.id}>
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>{provider.name}</Typography>
              <Chip size="small" label={kindLabel(provider.kind)} />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Rating size="small" readOnly value={provider.ratingAvg ?? 0} precision={0.5} />
              <Typography variant="body2" color="text.secondary">
                {provider.ratingAvg?.toFixed(1) ?? "—"} ({provider.ratingCount ?? 0})
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {provider.label ?? `${provider.lat.toFixed(5)}, ${provider.lng.toFixed(5)}`}
              {provider.distanceMeters ? ` · ${(provider.distanceMeters / 1000).toFixed(1)} km` : ""}
            </Typography>
            {Array.isArray(provider.services) && provider.services.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {[...provider.services]
                  .sort((a, b) =>
                    (provider.serviceUsage?.[b.code] ?? 0) -
                    (provider.serviceUsage?.[a.code] ?? 0))
                  .map((service) => (
                  <Chip
                    key={service.code}
                    size="small"
                    variant="outlined"
                    label={`${service.name}${(provider.serviceUsage?.[service.code] ?? 0) > 0 ? ` · ${t.provider.popular}` : ""} · ${service.quoteRequired ? t.provider.quoteRequired : `${service.displayPrice.toLocaleString()} ₫`}`}
                  />
                ))}
              </Box>
            )}
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button size="small" onClick={() => void openReviews(provider)}>{t.provider.reviews}</Button>
              <Button size="small" color="error" onClick={() => { setReportFor(provider); setReportReason("INFO_INACCURATE"); setReportNote(""); }}>{t.provider.report}</Button>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  return (
    <Screen maxWidth="md">
      <Typography variant="h6">{t.provider.title}</Typography>
      <Tabs value={mode} onChange={(_, value: Mode) => setMode(value)} sx={{ mt: 1 }}>
        <Tab value="mine" label={t.provider.mine} />
        <Tab value="find" label={t.provider.findTab} />
      </Tabs>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mt: 2 }}>{notice}</Alert>}
      <Box sx={{ mt: 2 }}>{mode === "mine" ? myCard : findCard}</Box>
      {form && (
        <ProviderFormDialog
          key={`${form.mode}-${form.provider?.id ?? "new"}`}
          mode={form.mode}
          provider={form.provider}
          onClose={() => setForm(null)}
          onSaved={async () => {
            setForm(null);
            setNotice(t.provider.saved);
            await reloadMine();
          }}
        />
      )}
      <Dialog open={reportFor !== null} onClose={() => setReportFor(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t.provider.report}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField select label={t.provider.reportReason} value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
            {["FAKE_BUSINESS", "WRONG_LOCATION", "UNSAFE", "HARASSMENT", "SPAM", "INFO_INACCURATE", "OTHER"].map((value) => (
              <MenuItem key={value} value={value}>{value.replaceAll("_", " ")}</MenuItem>
            ))}
          </TextField>
          <TextField label={t.provider.reportNote} value={reportNote} onChange={(e) => setReportNote(e.target.value)} multiline rows={3} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportFor(null)}>{t.common.close}</Button>
          <Button
            variant="contained"
            color="error"
            disabled={reportBusy}
            onClick={() => {
              if (!token || !reportFor) return;
              setReportBusy(true);
              void reportProvider({ providerId: reportFor.id, reason: reportReason, ...(reportNote.trim() ? { note: reportNote.trim() } : {}) }, token)
                .then(() => { setReportFor(null); setNotice(t.provider.reportSent); })
                .catch((err: unknown) => setError(toMessage(err)))
                .finally(() => setReportBusy(false));
            }}
          >{t.provider.report}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={reviewsFor !== null} onClose={() => setReviewsFor(null)} fullWidth maxWidth="sm">
        <DialogTitle>{reviewsFor?.name} · {t.provider.reviews}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {reviews.length === 0 ? <Typography color="text.secondary">{t.provider.noReviews}</Typography> : reviews.map((review) => (
            <Box key={review.id} sx={{ py: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Rating size="small" readOnly value={review.score} />
                <Typography variant="body2" color="text.secondary">{review.byUserName ?? "Rider"}</Typography>
              </Box>
              {review.text && <Typography variant="body2">{review.text}</Typography>}
              {review.reply && <Typography variant="body2" color="text.secondary">↳ {review.reply}</Typography>}
              <Divider sx={{ mt: 1 }} />
            </Box>
          ))}
        </DialogContent>
        <DialogActions><Button onClick={() => setReviewsFor(null)}>{t.common.close}</Button></DialogActions>
      </Dialog>
    </Screen>
  );
}

function ProviderFormDialog({
  mode,
  provider,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  provider: Provider | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useStrings();
  const { token } = useAuth();
  const [kind, setKind] = useState<ProviderKind>((provider?.kind as ProviderKind) ?? "SHOP");
  const [name, setName] = useState(provider?.name ?? "");
  const [label, setLabel] = useState(provider?.label ?? "");
  const [openHours, setOpenHours] = useState(provider?.openHours ?? "");
  const [plate, setPlate] = useState(provider?.plate ?? "");
  const [vehicleType, setVehicleType] = useState(provider?.vehicleType ?? "CAR");
  const [license, setLicense] = useState(provider?.licenseNumber ?? "");
  const [serviceFee, setServiceFee] = useState(String(provider?.serviceFee ?? ""));
  const [towBaseFee, setTowBaseFee] = useState(String(provider?.towBaseFee ?? ""));
  const [towPerKmFee, setTowPerKmFee] = useState(String(provider?.towPerKmFee ?? ""));
  const [waitingRate, setWaitingRate] = useState(String(provider?.waitingRatePer15Min ?? ""));
  const [taxCode, setTaxCode] = useState(provider?.taxCode ?? "");
  const [bookingEnabled, setBookingEnabled] = useState(provider?.bookingEnabled === true);
  const [bookingAlwaysOpen, setBookingAlwaysOpen] = useState(provider?.bookingAlwaysOpen === true);
  const [bookingSlotMinutes, setBookingSlotMinutes] = useState(String(provider?.bookingSlotMinutes ?? ""));
  const [bookingCapacity, setBookingCapacity] = useState(String(provider?.bookingCapacity ?? ""));
  const [bookingLeadMinutes, setBookingLeadMinutes] = useState(String(provider?.bookingLeadMinutes ?? ""));
  const [bookingHorizonDays, setBookingHorizonDays] = useState(String(provider?.bookingHorizonDays ?? ""));
  const [bookingHours, setBookingHours] = useState(provider?.bookingHours ?? "");
  const [depositPolicy, setDepositPolicy] = useState<"NONE" | "FIXED" | "PERCENT">(provider?.depositPolicy === "FIXED" || provider?.depositPolicy === "PERCENT" ? provider.depositPolicy : "NONE");
  const [depositAmount, setDepositAmount] = useState(String(provider?.depositAmount ?? ""));
  const [depositPercent, setDepositPercent] = useState(String(provider?.depositPercent ?? ""));
  const [callOutFee, setCallOutFee] = useState(String(provider?.callOutFee ?? ""));
  const [travelPerKmFee, setTravelPerKmFee] = useState(String(provider?.travelPerKmFee ?? ""));
  const [lat, setLat] = useState(String(provider?.lat ?? mapDefaults.center[1]));
  const [lng, setLng] = useState(String(provider?.lng ?? mapDefaults.center[0]));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricingLimits, setPricingLimits] = useState<ProviderPricingLimits | null>(null);
  const [services, setServices] = useState<ServiceRow[]>(() =>
    (Array.isArray(provider?.services) ? provider.services : []).map((service) => ({
      code: service.code,
      name: service.name,
      price: String(service.displayPrice),
      quoteRequired: service.quoteRequired,
      category: service.category ?? "OTHER",
      warrantyDays: typeof service.warrantyDays === "number" ?
        String(service.warrantyDays) : "",
      warrantyParts: service.warrantyParts ?? "LABOR_ONLY",
      channels: service.channels ?? ["BOOKING", "ASSIST"],
    })),
  );

  useEffect(() => {
    if (!token) return;
    let active = true;
    void fetchProviderPricingLimits(token)
      .then((limits) => {
        if (active) setPricingLimits(limits);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [token]);

  function updateService(index: number, patch: Partial<ServiceRow>): void {
    setServices((prev) => prev.map((row, i) => i === index ? {...row, ...patch} : row));
  }

  function addService(): void {
    setServices((prev) => [...prev, {
      code: "",
      name: "",
      price: "",
      quoteRequired: false,
      category: "OTHER",
      warrantyDays: "",
      warrantyParts: "LABOR_ONLY",
      channels: kind === "SHOP" && !bookingEnabled ?
        ["ASSIST"] :
        ["BOOKING", "ASSIST"],
    }]);
  }

  function removeService(index: number): void {
    setServices((prev) => prev.filter((_, i) => i !== index));
  }

  function buildServices(): Array<{code: string; name: string; displayPrice: number; quoteRequired: boolean; category: string; warrantyDays?: number; warrantyParts: "LABOR_ONLY" | "PARTS_AND_LABOR"; channels: Array<"BOOKING" | "ASSIST">}> | null {
    const out: Array<{code: string; name: string; displayPrice: number; quoteRequired: boolean; category: string; warrantyDays?: number; warrantyParts: "LABOR_ONLY" | "PARTS_AND_LABOR"; channels: Array<"BOOKING" | "ASSIST">}> = [];
    const seen = new Set<string>();
    for (let i = 0; i < services.length; i += 1) {
      const row = services[i];
      const name = row.name.trim();
      const digits = row.price.replace(/[^0-9]/g, "");
      if (name === "" && digits === "") continue;
      if (name === "" || digits === "") return null;
      const displayPrice = Number.parseInt(digits, 10);
      if (!Number.isFinite(displayPrice) || displayPrice < 0) return null;
      let code = row.code.trim() === "" ? serviceCodeFor(name, i) : row.code.trim().toUpperCase();
      if (seen.has(code)) code = `${code}_${i + 1}`;
      seen.add(code);
      const warrantyDigits = row.warrantyDays.replace(/[^0-9]/g, "");
      const warrantyDays = warrantyDigits === "" ?
        undefined :
        Number.parseInt(warrantyDigits, 10);
      if (warrantyDays !== undefined &&
        (!Number.isInteger(warrantyDays) || warrantyDays < 0 ||
          warrantyDays > 90)) return null;
      out.push({
        code,
        name,
        displayPrice,
        quoteRequired: row.quoteRequired,
        category: row.category,
        ...(warrantyDays !== undefined ? {warrantyDays} : {}),
        warrantyParts: row.warrantyParts,
        channels: row.channels,
      });
    }
    return out;
  }

  const limitText = (min?: number, max?: number): string | null =>
    typeof min === "number" && typeof max === "number" ?
      `${t.provider.pricingLimit}: ${min.toLocaleString()} – ${max.toLocaleString()} VND` :
      null;

  async function useLocation() {
    const point = await readLocation();
    setLat(String(point.lat));
    setLng(String(point.lng));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const catalog = kind === "SHOP" || kind === "MOBILE_SHOP" ? buildServices() : undefined;
      if (catalog === null) {
        setError(t.provider.serviceInvalid);
        return;
      }
      if (mode === "edit" && provider) {
        await updateProvider({
          providerId: provider.id,
          name: name.trim(),
          label: label.trim() || null,
          openHours: openHours.trim() || null,
          lat: Number(lat),
          lng: Number(lng),
          ...(serviceFee.trim() ? { serviceFee: Number(serviceFee) } : {}),
          ...(towBaseFee.trim() ? { towBaseFee: Number(towBaseFee) } : {}),
          ...(towPerKmFee.trim() ? { towPerKmFee: Number(towPerKmFee) } : {}),
          ...(waitingRate.trim() ? { waitingRatePer15Min: Number(waitingRate) } : {}),
          taxCode: taxCode.trim() || null,
          ...(provider.kind === "SHOP" ? {
            bookingEnabled,
            bookingAlwaysOpen,
            bookingHours: bookingHours.trim() || null,
            ...(bookingSlotMinutes.trim() ? { bookingSlotMinutes: Number(bookingSlotMinutes) } : {}),
            ...(bookingCapacity.trim() ? { bookingCapacity: Number(bookingCapacity) } : {}),
            ...(bookingLeadMinutes.trim() ? { bookingLeadMinutes: Number(bookingLeadMinutes) } : {}),
            ...(bookingHorizonDays.trim() ? { bookingHorizonDays: Number(bookingHorizonDays) } : {}),
            depositPolicy,
            ...(depositAmount.trim() ? { depositAmount: Number(depositAmount) } : {}),
            ...(depositPercent.trim() ? { depositPercent: Number(depositPercent) } : {}),
          } : {}),
          ...(callOutFee.trim() ? { callOutFee: Number(callOutFee) } : {}),
          ...(travelPerKmFee.trim() ? { travelPerKmFee: Number(travelPerKmFee) } : {}),
          ...(catalog !== undefined ? {services: catalog} : {}),
        }, token);
      } else if (kind === "SHOP") {
        await createShopProvider({ name: name.trim(), lat: Number(lat), lng: Number(lng), label: label.trim() || undefined, openHours: openHours.trim() || undefined, ...(serviceFee.trim() ? { serviceFee: Number(serviceFee) } : {}), ...(catalog !== undefined ? {services: catalog} : {}) }, token);
      } else if (kind === "TOW") {
        await createTowProvider({ name: name.trim(), lat: Number(lat), lng: Number(lng), label: label.trim() || undefined, plate: plate.trim(), vehicleType, ...(towBaseFee.trim() ? { towBaseFee: Number(towBaseFee) } : {}), ...(towPerKmFee.trim() ? { towPerKmFee: Number(towPerKmFee) } : {}), ...(waitingRate.trim() ? { waitingRatePer15Min: Number(waitingRate) } : {}) }, token);
      } else {
        await createMobileShopProvider({ name: name.trim(), lat: Number(lat), lng: Number(lng), label: label.trim() || undefined, plate: plate.trim(), vehicleType, licenseNumber: license.trim(), ...(callOutFee.trim() ? { callOutFee: Number(callOutFee) } : {}), ...(travelPerKmFee.trim() ? { travelPerKmFee: Number(travelPerKmFee) } : {}), ...(catalog !== undefined ? {services: catalog} : {}) }, token);
      }
      await onSaved();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={(e) => void submit(e)}>
        <DialogTitle>{mode === "edit" ? t.provider.edit : t.provider.add}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <FormSection title={t.provider.sectionProfile} />
          {mode === "create" && (
            <TextField select label={t.provider.kind} value={kind} onChange={(e) => setKind(e.target.value as ProviderKind)}>
              <MenuItem value="SHOP">Shop</MenuItem>
              <MenuItem value="TOW">Tow</MenuItem>
              <MenuItem value="MOBILE_SHOP">Mobile shop</MenuItem>
            </TextField>
          )}
          <TextField label={t.provider.name} value={name} onChange={(e) => setName(e.target.value)} required />
          <TextField label={t.provider.addressLabel} value={label} onChange={(e) => setLabel(e.target.value)} />
          <FormSection title={t.provider.sectionLocation} />
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField label="Lat" value={lat} onChange={(e) => setLat(e.target.value)} fullWidth />
            <TextField label="Lng" value={lng} onChange={(e) => setLng(e.target.value)} fullWidth />
          </Box>
          <Button size="small" startIcon={<MyLocationIcon />} onClick={() => void useLocation()}>{t.provider.useLocation}</Button>
          {(kind === "SHOP" || provider?.kind === "SHOP") && (
            <>
              <FormSection title={t.provider.sectionHours} />
              <TextField label={t.provider.hours} value={openHours} onChange={(e) => setOpenHours(e.target.value)} placeholder="08:00-20:00" />
              <TextField label={t.provider.serviceFee} type="number" value={serviceFee} onChange={(e) => setServiceFee(e.target.value)} />
              {mode === "edit" && provider?.kind === "SHOP" ? (
                <>
                  <FormSection title={t.provider.sectionBookings} />
                  <FormControlLabel control={<Switch checked={bookingEnabled} onChange={(e) => setBookingEnabled(e.target.checked)} />} label={t.provider.bookingEnabled} />
                  <FormControlLabel control={<Switch checked={bookingAlwaysOpen} onChange={(e) => setBookingAlwaysOpen(e.target.checked)} />} label={t.provider.bookingAlwaysOpen} />
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <TextField label={t.provider.bookingSlotMinutes} type="number" value={bookingSlotMinutes} onChange={(e) => setBookingSlotMinutes(e.target.value)} fullWidth />
                    <TextField label={t.provider.bookingCapacity} type="number" value={bookingCapacity} onChange={(e) => setBookingCapacity(e.target.value)} fullWidth />
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <TextField label={t.provider.bookingLeadMinutes} type="number" value={bookingLeadMinutes} onChange={(e) => setBookingLeadMinutes(e.target.value)} fullWidth />
                    <TextField label={t.provider.bookingHorizonDays} type="number" value={bookingHorizonDays} onChange={(e) => setBookingHorizonDays(e.target.value)} fullWidth />
                  </Box>
                  <TextField label={t.provider.bookingHours} value={bookingHours} onChange={(e) => setBookingHours(e.target.value)} placeholder="08:00-20:00" />
                  <TextField select label={t.provider.depositPolicy} value={depositPolicy} onChange={(e) => setDepositPolicy(e.target.value as "NONE" | "FIXED" | "PERCENT")}>
                    <MenuItem value="NONE">{t.provider.depositNone}</MenuItem>
                    <MenuItem value="FIXED">{t.provider.depositFixed}</MenuItem>
                    <MenuItem value="PERCENT">{t.provider.depositPercent}</MenuItem>
                  </TextField>
                  {depositPolicy === "FIXED" ? <TextField label={t.provider.depositAmount} type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} /> : null}
                  {depositPolicy === "PERCENT" ? <TextField label={t.provider.depositPercentValue} type="number" value={depositPercent} onChange={(e) => setDepositPercent(e.target.value)} /> : null}
                </>
              ) : null}
            </>
          )}
          {(kind === "TOW" || kind === "MOBILE_SHOP" || provider?.kind === "TOW" || provider?.kind === "MOBILE_SHOP") && (
            <FormSection title={t.provider.sectionVehicleFees} />
          )}
          {(kind === "TOW" || provider?.kind === "TOW") && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField label={t.provider.towBaseFee} type="number" value={towBaseFee} onChange={(e) => setTowBaseFee(e.target.value)} fullWidth />
                <TextField label={t.provider.towPerKmFee} type="number" value={towPerKmFee} onChange={(e) => setTowPerKmFee(e.target.value)} fullWidth />
              </Box>
              <TextField label={t.provider.waitingRate} type="number" value={waitingRate} onChange={(e) => setWaitingRate(e.target.value)} />
              {pricingLimits && (
                <Typography variant="caption" color="text.secondary">
                  {limitText(pricingLimits.TOW.baseMin, pricingLimits.TOW.baseMax)}
                </Typography>
              )}
              {pricingLimits && (
                <Typography variant="caption" color="text.secondary">
                  {limitText(pricingLimits.TOW.perKmMin, pricingLimits.TOW.perKmMax)}
                </Typography>
              )}
            </Box>
          )}
          {(kind === "MOBILE_SHOP" || provider?.kind === "MOBILE_SHOP") && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField label={t.provider.callOutFee} type="number" value={callOutFee} onChange={(e) => setCallOutFee(e.target.value)} fullWidth />
                <TextField label={t.provider.travelPerKmFee} type="number" value={travelPerKmFee} onChange={(e) => setTravelPerKmFee(e.target.value)} fullWidth />
              </Box>
              {pricingLimits && (
                <Typography variant="caption" color="text.secondary">
                  {limitText(pricingLimits.MOBILE_SHOP.callOutMin, pricingLimits.MOBILE_SHOP.callOutMax)}
                </Typography>
              )}
              {pricingLimits && (
                <Typography variant="caption" color="text.secondary">
                  {limitText(pricingLimits.MOBILE_SHOP.travelPerKmMin, pricingLimits.MOBILE_SHOP.travelPerKmMax)}
                </Typography>
              )}
            </Box>
          )}
          {(kind === "TOW" || kind === "MOBILE_SHOP" || provider?.kind === "TOW" || provider?.kind === "MOBILE_SHOP") && (
            <>
              <TextField label={t.tow.plate} value={plate} onChange={(e) => setPlate(e.target.value)} required />
              <TextField select label={t.vehicle.type} value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                {["CAR", "VAN", "TRUCK"].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
              </TextField>
            </>
          )}
          {(kind === "MOBILE_SHOP" || provider?.kind === "MOBILE_SHOP") && (
            <TextField label={t.provider.license} value={license} onChange={(e) => setLicense(e.target.value)} required />
          )}
          <FormSection title={t.provider.sectionBilling} />
          <TextField label={t.provider.taxCode} value={taxCode} onChange={(e) => setTaxCode(e.target.value)} />
          {(kind === "SHOP" || kind === "MOBILE_SHOP" || provider?.kind === "SHOP" || provider?.kind === "MOBILE_SHOP") && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <FormSection title={t.provider.sectionServices} />
              <Typography variant="subtitle2">{t.provider.servicesTitle}</Typography>
              <Typography variant="caption" color="text.secondary">{t.provider.serviceHint}</Typography>
              {services.map((row, index) => (
                <Card key={`${index}-${row.code}`} variant="outlined">
                  <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1, py: 1.5 }}>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <TextField size="small" label={t.provider.serviceName} value={row.name} onChange={(e) => updateService(index, {name: e.target.value})} fullWidth />
                      <IconButton aria-label={t.provider.serviceRemove} onClick={() => removeService(index)}><DeleteIcon /></IconButton>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <TextField size="small" type="number" label={t.provider.servicePrice} value={row.price} onChange={(e) => updateService(index, {price: e.target.value})} fullWidth />
                      <TextField select size="small" label={t.provider.servicePricing} value={row.quoteRequired ? "inspection" : "fixed"} onChange={(e) => updateService(index, {quoteRequired: e.target.value === "inspection"})} fullWidth>
                        <MenuItem value="fixed">{t.provider.serviceFixed}</MenuItem>
                        <MenuItem value="inspection">{t.provider.serviceInspection}</MenuItem>
                      </TextField>
                    </Box>
                    <TextField select size="small" label={t.provider.serviceCategory} value={row.category} onChange={(e) => updateService(index, {category: e.target.value})}>
                      {SERVICE_CATEGORY_IDS.map((id) => <MenuItem key={id} value={id}>{(t.provider.categories as Record<string, string>)[id]}</MenuItem>)}
                    </TextField>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                      <Typography variant="caption" color="text.secondary">{t.provider.channelHint}</Typography>
                      {kind === "SHOP" && !bookingEnabled ? (
                        <Typography variant="caption" color="text.secondary">{t.provider.channelBookingsOff}</Typography>
                      ) : null}
                      {(["BOOKING", "ASSIST"] as const).map((channel) => {
                        const selected = row.channels.includes(channel);
                        const disabled = channel === "BOOKING" &&
                          kind === "SHOP" && !bookingEnabled;
                        return (
                          <Chip
                            key={channel}
                            size="small"
                            label={channel === "BOOKING" ? t.provider.channelBooking : t.provider.channelAssist}
                            color={selected ? "primary" : "default"}
                            variant={selected ? "filled" : "outlined"}
                            disabled={disabled}
                            onClick={() => updateService(index, {
                              channels: selected && row.channels.length === 1 ?
                                row.channels :
                                selected ?
                                  row.channels.filter((item) => item !== channel) :
                                  [...row.channels, channel],
                            })}
                          />
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              ))}
              <Button size="small" startIcon={<AddIcon />} onClick={addService}>{t.provider.serviceAdd}</Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t.common.close}</Button>
          <Button type="submit" variant="contained" disabled={busy || !name.trim()}>{t.common.save}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
