import { useEffect, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toMessage } from "../api/client";
import {
  addRideConfig,
  createProfile,
  listProfiles,
  type ConfigType,
  type VehicleProfile,
  type VehicleType,
} from "../api/vehicles";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";
import { setRoutingWidth } from "../storage/vehicleWidth";

const TYPES: VehicleType[] = ["SCOOTER", "CUB", "MANUAL"];
const CONFIGS: ConfigType[] = ["SOLO", "PASSENGER", "CARGO"];

export default function VehicleScreen() {
  const { t } = useStrings();
  const { token } = useAuth();
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
      if (estWidth && Number(estWidth) > 0) {
        setRoutingWidth(Number(estWidth));
      }
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
          <Card>
            <CardContent>
              <Typography variant="subtitle1">{t.vehicle.profiles}</Typography>
              {profiles.length === 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {t.vehicle.none}
                </Typography>
              )}
              {profiles.map((p) => (
                <Box
                  key={p.id}
                  sx={{
                    mt: 1,
                    display: "flex",
                    justifyContent: "space-between",
                    bgcolor: "action.hover",
                    borderRadius: 2,
                    px: 1.5,
                    py: 1,
                  }}
                >
                  <Typography variant="body2">{p.type}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t.vehicle.width}: {p.baseWidth} m
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="subtitle1">{t.vehicle.create}</Typography>
              <Box
                component="form"
                onSubmit={onCreate}
                sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}
              >
                <TextField
                  select
                  label={t.vehicle.type}
                  value={type}
                  onChange={(e) => setType(e.target.value as VehicleType)}
                  fullWidth
                >
                  {TYPES.map((v) => (
                    <MenuItem key={v} value={v}>
                      {v}
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
            </CardContent>
          </Card>
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
                        {p.type} · {p.baseWidth} m
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
                        {c}
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
