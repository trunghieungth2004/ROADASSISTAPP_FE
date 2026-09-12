import { useCallback, useEffect, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { toMessage } from "../api/client";
import {
  alleysNear,
  submitAlley,
  type AlleySegment,
  type Tier,
} from "../api/alleys";
import {
  confirmFlag,
  flagsNear,
  myFlags,
  submitFlag,
  unflag,
  type Flag,
  type FlagType,
} from "../api/flags";
import MapView, { type MapClick } from "../components/MapView";
import { flagStatusColor, flagStatusLabel } from "../components/flagStatus";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";
import { hasVoted, markVoted } from "../storage/votedFlags";
import { mapDefaults } from "../map/style";

const FLAG_TYPES: FlagType[] = ["FLOOD", "OBSTRUCTION", "ACCIDENT"];
const TIERS: Tier[] = ["TIER1", "TIER2", "TIER3"];

export default function HazardsScreen() {
  const { t } = useStrings();
  const { token, uid } = useAuth();
  const [point, setPoint] = useState({ lat: mapDefaults.center[1], lng: mapDefaults.center[0] });
  const [scope, setScope] = useState<"nearby" | "mine">("nearby");
  const [flags, setFlags] = useState<Flag[]>([]);
  const [mine, setMine] = useState<Flag[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [segments, setSegments] = useState<AlleySegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [flagType, setFlagType] = useState<FlagType>("FLOOD");
  const [radius, setRadius] = useState("200");
  const [note, setNote] = useState("");
  const [baseWidth, setBaseWidth] = useState("1.2");
  const [tier, setTier] = useState<Tier>("TIER2");

  const reload = useCallback(async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [f, s] = await Promise.all([
        flagsNear(point.lat, point.lng, 2000, token),
        alleysNear(point.lat, point.lng, 2000, token),
      ]);
      setFlags(f);
      setSegments(s);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token, point]);

  function onPick(p: MapClick) {
    setPoint({ lat: p.lat, lng: p.lng });
  }

  async function onSubmitFlag(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await submitFlag(
        {
          type: flagType,
          lat: point.lat,
          lng: point.lng,
          note: note || undefined,
          radiusMeters: radius ? Number(radius) : undefined,
        },
        token,
      );
      setNotice(t.hazards.reported);
      setNote("");
      await reload();
    } catch (err) {
      setError(toMessage(err));
    }
  }

  const reloadMine = useCallback(async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setMine(await myFlags(token));
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (scope === "mine") {
      void reloadMine();
    }
  }, [scope, reloadMine]);

  async function onConfirm(flagId: string) {
    if (!token) {
      return;
    }
    setError(null);
    try {
      const res = await confirmFlag(flagId, token);
      markVoted(flagId);
      setVotedIds((prev) => new Set(prev).add(flagId));
      setNotice(
        res.alreadyVoted ? t.hazards.alreadyVoted : t.hazards.confirmedMsg,
      );
      await reload();
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onUnflag(flagId: string) {
    if (!token) {
      return;
    }
    setError(null);
    try {
      await unflag(flagId, token);
      if (scope === "mine") {
        await reloadMine();
      } else {
        await reload();
      }
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onSubmitAlley(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await submitAlley(
        { lat: point.lat, lng: point.lng, baseWidth: Number(baseWidth), tier },
        token,
      );
      setNotice(t.hazards.alleySaved);
      await reload();
    } catch (err) {
      setError(toMessage(err));
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2, overflowY: "auto", height: "100%" }}>
      <Typography variant="h6">{t.hazards.title}</Typography>
      <ToggleButtonGroup
        value={scope}
        exclusive
        fullWidth
        size="small"
        sx={{ mt: 1 }}
        onChange={(_, v: "nearby" | "mine" | null) => {
          if (v) {
            setScope(v);
          }
        }}
      >
        <ToggleButton value="nearby">{t.hazards.tabsNearby}</ToggleButton>
        <ToggleButton value="mine">{t.hazards.tabsMine}</ToggleButton>
      </ToggleButtonGroup>
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
      {scope === "mine" ? (
        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          {mine.length === 0 && !loading && (
            <Typography variant="body2" color="text.secondary">
              {t.hazards.myEmpty}
            </Typography>
          )}
          {mine.map((f) => (
            <Card key={f.id}>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="subtitle1">{f.type}</Typography>
                  <Chip
                    label={flagStatusLabel(f.status, t)}
                    size="small"
                    sx={{ bgcolor: flagStatusColor(f.status), color: "#fff" }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {f.voteCount ?? 0} {t.hazards.votes} · {f.lat.toFixed(5)},{" "}
                  {f.lng.toFixed(5)}
                </Typography>
                {f.note && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {f.note}
                  </Typography>
                )}
                {f.status !== "3" && (
                  <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void onUnflag(f.id)}
                    >
                      {t.hazards.unflag}
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <>
      <Typography variant="caption" color="text.secondary">
        {t.hazards.pickPoint}
      </Typography>
      <Box sx={{ position: "relative", height: 224, mt: 1, borderRadius: 4, overflow: "hidden" }}>
        <MapView onClick={onPick} />
      </Box>
      <Button
        variant="contained"
        fullWidth
        disabled={loading}
        onClick={() => void reload()}
        sx={{ mt: 1 }}
      >
        {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
      </Button>
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
        {flags.length === 0 && !loading && (
          <Typography variant="body2" color="text.secondary">
            {t.hazards.empty}
          </Typography>
        )}
        {flags.map((f) => (
          <Card key={f.id}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="subtitle1">{f.type}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {f.voteCount ?? 0} {t.hazards.votes} · {f.status}
                </Typography>
              </Box>
              {f.note && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {f.note}
                </Typography>
              )}
              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                {f.reporterId !== uid &&
                  !votedIds.has(f.id) &&
                  !hasVoted(f.id) && (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={() => void onConfirm(f.id)}
                    >
                      {t.hazards.confirm}
                    </Button>
                  )}
                {f.reporterId === uid && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => void onUnflag(f.id)}
                  >
                    {t.hazards.unflag}
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent>
            <Typography variant="subtitle1">{t.hazards.submitFlag}</Typography>
            <Box
              component="form"
              onSubmit={onSubmitFlag}
              sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                select
                label={t.flag.type}
                value={flagType}
                onChange={(e) => setFlagType(e.target.value as FlagType)}
                fullWidth
              >
                {FLAG_TYPES.map((v) => (
                  <MenuItem key={v} value={v}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label={t.hazards.radius}
                type="number"
                slotProps={{ htmlInput: { min: 25, max: 3000 } }}
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                fullWidth
              />
              <TextField
                label={t.hazards.note}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                fullWidth
              />
              <Button type="submit" variant="contained">
                {t.common.save}
              </Button>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="subtitle1">
              {t.hazards.alleys} ({segments.length})
            </Typography>
            {segments.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t.hazards.noAlleys}
              </Typography>
            )}
            {segments.map((s) => (
              <Box
                key={s.id}
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
                <Typography variant="body2">{s.tier}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t.vehicle.width}: {s.baseWidth} m
                </Typography>
              </Box>
            ))}
            <Box
              component="form"
              onSubmit={onSubmitAlley}
              sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}
            >
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
                select
                label={t.hazards.tier}
                value={tier}
                onChange={(e) => setTier(e.target.value as Tier)}
                fullWidth
              >
                {TIERS.map((v) => (
                  <MenuItem key={v} value={v}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
              <Button type="submit" variant="contained">
                {t.hazards.submitAlley}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
        </>
      )}
    </Container>
  );
}
