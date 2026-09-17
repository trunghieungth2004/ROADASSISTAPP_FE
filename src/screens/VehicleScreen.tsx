import { useEffect, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Fab from "@mui/material/Fab";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import { toMessage } from "../api/client";
import {
  addRideConfig,
  createProfile,
  listProfiles,
  setTowVehicle,
  VEHICLE_DEFAULT_WIDTH,
  type ConfigType,
  type TowVehicleType,
  type VehicleProfile,
  type VehicleType,
} from "../api/vehicles";
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

  function onTypeChange(next: VehicleType) {
    setType(next);
    setBaseWidth(String(VEHICLE_DEFAULT_WIDTH[next] ?? 0.7));
    setBaseHeight(next === "CAR" ? "1.5" : "1.1");
  }

  async function onUseProfile(p: VehicleProfile) {
    setError(null);
    try {
      await activateVehicle(p.id);
      setNotice(t.vehicle.activeSaved);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onSetTow(p: VehicleProfile, next: TowVehicleType | null) {
    if (!token) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await setTowVehicle(p.id, next, token);
      await reload(token);
      await refresh();
      setNotice(t.vehicle.towSaved);
    } catch (err) {
      setError(toMessage(err));
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
    if (token) {
      void reload(token);
    }
  }, [token]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      return;
    }
    setError(null);
    setNotice(null);
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
    }
  }

  async function onRideConfig(e: FormEvent) {
    e.preventDefault();
    if (!token || !profileId) {
      return;
    }
    setError(null);
    setNotice(null);
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
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2, overflowY: "auto", height: "100%" }}>
      <Typography variant="h6">{t.vehicle.title}</Typography>
      {loading && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t.common.loading}
        </Typography>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {notice}
        </Alert>
      )}
      {!loading && !error && (
        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <Fab
            color="primary"
            aria-label={t.vehicle.create}
            sx={{ position: "fixed", bottom: 72, right: 16 }}
            onClick={() => setCreateOpen(true)}
          >
            <AddIcon />
          </Fab>
          <Card>
            <CardContent>
              <Typography variant="subtitle1">{t.vehicle.profiles}</Typography>
              {profiles.length === 0 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  {t.vehicle.onboarding}
                </Alert>
              )}
              {profiles.map((p) => (
                <Box
                  key={p.id}
                  sx={{
                    mt: 1,
                    bgcolor: "action.hover",
                    borderRadius: 2,
                    px: 1.5,
                    py: 1,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Box>
                      <Typography variant="body2">
                        {vehicleTypeLabel(p.type, t)}
                        {activeVehicle?.id === p.id &&
                          ` · ${t.vehicle.active}`}
                        {p.towVehicleType &&
                          ` · ${t.vehicle.towVehicle}: ${p.towVehicleType}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t.vehicle.width}: {p.baseWidth} m
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      disabled={activeVehicle?.id === p.id}
                      onClick={() => void onUseProfile(p)}
                    >
                      {t.vehicle.useForRoute}
                    </Button>
                  </Box>
                  {TOWABLE.has(p.type) && (
                    <TextField
                      select
                      size="small"
                      label={t.vehicle.towVehicle}
                      value={p.towVehicleType ?? ""}
                      onChange={(e) =>
                        void onSetTow(
                          p,
                          (e.target.value as TowVehicleType) || null,
                        )
                      }
                      fullWidth
                      sx={{ mt: 1 }}
                    >
                      <MenuItem value="">{t.vehicle.towNone}</MenuItem>
                      {TOW_TYPES.map((v) => (
                        <MenuItem key={v} value={v}>
                          {v}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </Box>
              ))}
            </CardContent>
          </Card>
          <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
            <DialogTitle>{t.vehicle.create}</DialogTitle>
            <DialogContent
              sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
            >
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
                  {TYPES.map((v) => (
                    <MenuItem key={v} value={v}>
                      {vehicleTypeLabel(v, t)}
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
                <Button type="submit" variant="contained">
                  {t.common.save}
                </Button>
              </Box>
            </DialogContent>
          </Dialog>
          {profiles.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1">
                  {t.vehicle.rideSetup}
                </Typography>
                <Box
                  component="form"
                  onSubmit={onRideConfig}
                  sx={{
                    mt: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <TextField
                    select
                    label={t.vehicle.profiles}
                    value={profileId}
                    onChange={(e) => setProfileId(e.target.value)}
                    fullWidth
                  >
                    {profiles.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {vehicleTypeLabel(p.type, t)} · {p.baseWidth} m
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
                    {CONFIGS.map((c) => (
                      <MenuItem key={c} value={c}>
                        {configTypeLabel(c, t)}
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
                  <Button type="submit" variant="contained">
                    {t.vehicle.apply}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      )}
    </Container>
  );
}
