import { useEffect, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import { toMessage } from "../api/client";
import {
  addRideConfig,
  createProfile,
  listProfiles,
  removeProfile,
  setTowVehicle,
  VEHICLE_DEFAULT_WIDTH,
  type ConfigType,
  type TowVehicleType,
  type VehicleProfile,
  type VehicleType,
} from "../api/vehicles";
import Screen from "../components/ui/Screen";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { useStrings } from "../context/LanguageContext";
import { configTypeLabel, vehicleTypeLabel } from "../i18n/labels";

const TYPES: VehicleType[] = ["SCOOTER", "CUB", "MANUAL", "CAR"];
const CONFIGS: ConfigType[] = ["SOLO", "PASSENGER", "CARGO"];
const TOW_TYPES: TowVehicleType[] = ["CAR", "VAN", "TRUCK"];
const TOWABLE = new Set(["CAR", "VAN", "TRUCK"]);

export default function VehicleScreen() {
  const { t } = useStrings();
  const { token } = useAuth();
  const { activeVehicle, activateVehicle, refresh } = useProfile();
  const [profiles, setProfiles] = useState<VehicleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [type, setType] = useState<VehicleType>("SCOOTER");
  const [baseWidth, setBaseWidth] = useState("0.7");
  const [baseHeight, setBaseHeight] = useState("1.1");
  const [profileId, setProfileId] = useState("");
  const [configType, setConfigType] = useState<ConfigType>("SOLO");
  const [estWidth, setEstWidth] = useState("0.9");
  const [estHeight, setEstHeight] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [vehicleBusy, setVehicleBusy] = useState(false);

  function onTypeChange(next: VehicleType) {
    setType(next);
    setBaseWidth(String(VEHICLE_DEFAULT_WIDTH[next] ?? 0.7));
    setBaseHeight(next === "CAR" ? "1.5" : "1.1");
  }

  async function activateProfile(profile: VehicleProfile) {
    if (vehicleBusy) return;
    setError(null);
    setVehicleBusy(true);
    try {
      await activateVehicle(profile.id);
      await refresh();
      setNotice(t.vehicle.activeSaved);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setVehicleBusy(false);
    }
  }

  async function onRemove(profile: VehicleProfile) {
    if (!token || vehicleBusy || !window.confirm(t.vehicle.removeConfirm)) return;
    setError(null);
    setNotice(null);
    setVehicleBusy(true);
    try {
      await removeProfile(profile.id, token);
      await reload(token);
      await refresh();
      setNotice(t.vehicle.removed);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setVehicleBusy(false);
    }
  }

  async function onSetTow(profile: VehicleProfile, next: TowVehicleType | null) {
    if (!token || vehicleBusy) return;
    setError(null);
    setNotice(null);
    setVehicleBusy(true);
    try {
      await setTowVehicle(profile.id, next, token);
      await reload(token);
      await refresh();
      setNotice(t.vehicle.towSaved);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setVehicleBusy(false);
    }
  }

  async function reload(key: string) {
    setLoading(true);
    setError(null);
    try {
      const list = await listProfiles(key);
      setProfiles(list);
      if (!profileId && list.length > 0) {
        setProfileId(list[0].id);
      }
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) void reload(token);
  }, [token]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token || vehicleBusy) return;
    setError(null);
    setNotice(null);
    setVehicleBusy(true);
    try {
      await createProfile(
        {
          type,
          baseWidth: Number(baseWidth),
          baseHeight: Number(baseHeight),
        },
        token,
      );
      await reload(token);
      await refresh();
      setCreateOpen(false);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setVehicleBusy(false);
    }
  }

  async function onRideConfig(e: FormEvent) {
    e.preventDefault();
    if (!token || !profileId || vehicleBusy) return;
    setError(null);
    setNotice(null);
    setVehicleBusy(true);
    try {
      await addRideConfig(
        {
          profileId,
          configType,
          estWidth: estWidth ? Number(estWidth) : undefined,
          estHeight: estHeight ? Number(estHeight) : undefined,
        },
        token,
      );
      setNotice(t.vehicle.rideSaved);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setVehicleBusy(false);
    }
  }

  return (
    <Screen>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {t.vehicle.title}
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          {t.vehicle.create}
        </Button>
      </Box>
      {loading ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t.common.loading}
        </Typography>
      ) : null}
      {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mt: 2 }}>{notice}</Alert> : null}
      {!loading ? (
        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <Card>
            <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
              <Typography variant="subtitle2" sx={{ px: 2, pt: 2 }}>
                {t.vehicle.profiles}
              </Typography>
              {profiles.length === 0 ? (
                <Box sx={{ px: 2, pb: 2, mt: 1 }}>
                  <Alert severity="info">{t.vehicle.onboarding}</Alert>
                </Box>
              ) : null}
              {profiles.map((profile, index) => (
                <Box key={profile.id}>
                  {index > 0 || profiles.length > 0 ? <Divider sx={{ mt: 1 }} /> : null}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.5 }}>
                    <TwoWheelerIcon sx={{ color: "primary.main" }} />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 15, fontWeight: 500 }}>
                        {vehicleTypeLabel(profile.type, t)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {`${t.vehicle.width}: ${profile.baseWidth} m`}
                        {profile.towVehicleType
                          ? ` · ${t.vehicle.towVehicle}: ${profile.towVehicleType}`
                          : ""}
                      </Typography>
                    </Box>
                    {activeVehicle?.id === profile.id ? (
                      <Chip size="small" color="primary" label={t.vehicle.active} />
                    ) : (
                      <Button size="small" disabled={vehicleBusy} onClick={() => void activateProfile(profile)}>
                        {t.vehicle.useForRoute}
                      </Button>
                    )}
                    <Button
                      size="small"
                      color="error"
                      disabled={vehicleBusy}
                      onClick={() => void onRemove(profile)}
                    >
                      {t.vehicle.remove}
                    </Button>
                  </Box>
                  {TOWABLE.has(profile.type) ? (
                    <TextField
                      select
                      size="small"
                      label={t.vehicle.towVehicle}
                      value={profile.towVehicleType ?? ""}
                      onChange={(e) =>
                        void onSetTow(profile, (e.target.value as TowVehicleType) || null)
                      }
                      disabled={vehicleBusy}
                      fullWidth
                      sx={{ px: 2, pb: 2, "& .MuiInputBase-root": { mx: 0 } }}
                    >
                      <MenuItem value="">{t.vehicle.towNone}</MenuItem>
                      {TOW_TYPES.map((value) => (
                        <MenuItem key={value} value={value}>
                          {value}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : null}
                </Box>
              ))}
            </CardContent>
          </Card>
          {profiles.length > 0 ? (
            <Card>
              <CardContent>
                <Typography variant="subtitle1">{t.vehicle.rideSetup}</Typography>
                <Box
                  component="form"
                  onSubmit={onRideConfig}
                  sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <TextField
                    select
                    label={t.vehicle.profiles}
                    value={profileId}
                    onChange={(e) => setProfileId(e.target.value)}
                    fullWidth
                  >
                    {profiles.map((profile) => (
                      <MenuItem key={profile.id} value={profile.id}>
                        {vehicleTypeLabel(profile.type, t)} · {profile.baseWidth} m
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label={t.vehicle.load}
                    value={configType}
                    onChange={(e) => setConfigType(e.target.value as ConfigType)}
                    fullWidth
                  >
                    {CONFIGS.map((value) => (
                      <MenuItem key={value} value={value}>
                        {configTypeLabel(value, t)}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label={t.vehicle.estWidth}
                    type="number"
                    slotProps={{ htmlInput: { step: "0.05", min: "0.1" } }}
                    value={estWidth}
                    onChange={(e) => setEstWidth(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label={t.vehicle.estHeight}
                    type="number"
                    slotProps={{ htmlInput: { step: "0.05", min: "0.1" } }}
                    value={estHeight}
                    onChange={(e) => setEstHeight(e.target.value)}
                    fullWidth
                  />
                  <Button type="submit" variant="contained" disabled={vehicleBusy}>
                    {t.vehicle.apply}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ) : null}
          <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
            <DialogTitle>{t.vehicle.create}</DialogTitle>
            <DialogContent>
              <Box
                component="form"
                onSubmit={onCreate}
                sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}
              >
                <TextField
                  select
                  label={t.vehicle.type}
                  value={type}
                  onChange={(e) => onTypeChange(e.target.value as VehicleType)}
                  fullWidth
                >
                  {TYPES.map((value) => (
                    <MenuItem key={value} value={value}>
                      {vehicleTypeLabel(value, t)}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label={t.vehicle.widthMeters}
                  type="number"
                  required
                  slotProps={{ htmlInput: { step: "0.05", min: "0.1" } }}
                  value={baseWidth}
                  onChange={(e) => setBaseWidth(e.target.value)}
                  fullWidth
                />
                <TextField
                  label={t.vehicle.height}
                  type="number"
                  required
                  slotProps={{ htmlInput: { step: "0.05", min: "0.1" } }}
                  value={baseHeight}
                  onChange={(e) => setBaseHeight(e.target.value)}
                  fullWidth
                />
                <Button type="submit" variant="contained" disabled={vehicleBusy}>
                  {t.common.save}
                </Button>
              </Box>
            </DialogContent>
          </Dialog>
        </Box>
      ) : null}
    </Screen>
  );
}
