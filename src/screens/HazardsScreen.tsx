import { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import AddAlertIcon from "@mui/icons-material/AddAlert";
import MapIcon from "@mui/icons-material/Map";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import { toMessage } from "../api/client";
import {
  confirmFlag,
  denyFlag,
  flagsNear,
  myFlags,
  submitFlag,
  unflag,
  type Flag,
  type FlagType,
} from "../api/flags";
import { formatPoint, resolveLabel } from "../api/places";
import MapView, { type MapClick } from "../components/MapView";
import ChatDialog from "../components/ChatDialog";
import FlagDetailSheet from "../components/FlagDetailSheet";
import FlagSheet, { type FlagReport } from "../components/FlagSheet";
import { flagStatusColor, flagStatusLabel } from "../components/flagStatus";
import Screen from "../components/ui/Screen";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";
import { flagTypeLabel } from "../i18n/labels";
import { mapDefaults } from "../map/style";
import {
  hasDenied,
  hasVoted,
  markDenied,
  markVoted,
} from "../storage/votedFlags";

const FLAG_TYPES: FlagType[] = ["FLOOD", "OBSTRUCTION", "ACCIDENT"];

export default function HazardsScreen() {
  const { t, lang } = useStrings();
  const { token, uid } = useAuth();
  const [point, setPoint] = useState({
    lat: mapDefaults.center[1],
    lng: mapDefaults.center[0],
  });
  const [pointLabel, setPointLabel] = useState<string | null>(null);
  const [scope, setScope] = useState<"nearby" | "mine">("nearby");
  const [filter, setFilter] = useState<FlagType | "ALL">("ALL");
  const [flags, setFlags] = useState<Flag[]>([]);
  const [mine, setMine] = useState<Flag[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [deniedIds, setDeniedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [selected, setSelected] = useState<Flag | null>(null);
  const [chatFlag, setChatFlag] = useState<Flag | null>(null);

  const reload = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setFlags(await flagsNear(point.lat, point.lng, 2000, token));
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token, point]);

  const reloadMine = useCallback(async () => {
    if (!token) return;
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
    if (scope === "nearby") {
      void reload();
    } else {
      void reloadMine();
    }
  }, [scope, reload, reloadMine]);

  const active = scope === "nearby" ? flags : mine;
  const visible = useMemo(
    () => (filter === "ALL" ? active : active.filter((flag) => flag.type === filter)),
    [active, filter],
  );

  function onPick(picked: MapClick) {
    const next = { lat: picked.lat, lng: picked.lng };
    setPoint(next);
    setPointLabel(formatPoint(next.lat, next.lng));
    void resolveLabel(next.lat, next.lng, lang).then(setPointLabel);
  }

  function useLocation() {
    navigator.geolocation?.getCurrentPosition((pos) => {
      const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setPoint(next);
      setPointLabel(formatPoint(next.lat, next.lng));
      void resolveLabel(next.lat, next.lng, lang).then(setPointLabel);
    });
  }

  async function onReport(report: FlagReport) {
    if (!token) return;
    setError(null);
    setNotice(null);
    try {
      await submitFlag(
        {
          type: report.type,
          lat: point.lat,
          lng: point.lng,
          note: report.note,
          radiusMeters: report.radiusMeters,
          ...(report.photoUrls && report.photoUrls.length > 0
            ? { photoUrls: report.photoUrls }
            : {}),
        },
        token,
      );
      setReportOpen(false);
      setNotice(t.hazards.reported);
      if (scope === "nearby") {
        await reload();
      } else {
        await reloadMine();
      }
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onConfirm(flagId: string) {
    if (!token || actionBusy) return;
    setActionBusy(true);
    setError(null);
    try {
      const result = await confirmFlag(flagId, token);
      markVoted(flagId);
      setVotedIds((prev) => new Set(prev).add(flagId));
      setSelected(null);
      setNotice(
        result.alreadyVoted ? t.hazards.alreadyVoted : t.hazards.confirmedMsg,
      );
      if (scope === "nearby") {
        await reload();
      } else {
        await reloadMine();
      }
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setActionBusy(false);
    }
  }

  async function onDeny(flagId: string) {
    if (!token || actionBusy) return;
    setActionBusy(true);
    setError(null);
    try {
      await denyFlag(flagId, token);
      markDenied(flagId);
      setDeniedIds((prev) => new Set(prev).add(flagId));
      setSelected(null);
      if (scope === "nearby") {
        await reload();
      } else {
        await reloadMine();
      }
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setActionBusy(false);
    }
  }

  async function onRemove(flagId: string) {
    if (!token || actionBusy) return;
    setActionBusy(true);
    setError(null);
    try {
      await unflag(flagId, token);
      setSelected(null);
      if (scope === "nearby") {
        await reload();
      } else {
        await reloadMine();
      }
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <Screen>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {t.hazards.title}
        </Typography>
        <Chip
          icon={<MapIcon />}
          label={showMap ? t.hazards.showList : t.hazards.showMap}
          onClick={() => setShowMap((value) => !value)}
          variant={showMap ? "filled" : "outlined"}
        />
      </Box>
      <ToggleButtonGroup
        value={scope}
        exclusive
        fullWidth
        size="small"
        color="primary"
        sx={{ mt: 1.5 }}
        onChange={(_, value: "nearby" | "mine" | null) => {
          if (value) setScope(value);
        }}
      >
        <ToggleButton value="nearby">{t.hazards.tabsNearby}</ToggleButton>
        <ToggleButton value="mine">{t.hazards.tabsMine}</ToggleButton>
      </ToggleButtonGroup>
      <Box sx={{ mt: 1.5, display: "flex", gap: 0.75, flexWrap: "wrap" }}>
        <Chip
          size="small"
          label={t.hazards.all}
          color={filter === "ALL" ? "primary" : "default"}
          variant={filter === "ALL" ? "filled" : "outlined"}
          onClick={() => setFilter("ALL")}
        />
        {FLAG_TYPES.map((type) => (
          <Chip
            key={type}
            size="small"
            label={flagTypeLabel(type, t)}
            color={filter === type ? "primary" : "default"}
            variant={filter === type ? "filled" : "outlined"}
            onClick={() => setFilter(type)}
          />
        ))}
      </Box>
      <Box sx={{ mt: 1.5, display: "flex", gap: 1 }}>
        <Button
          variant="contained"
          startIcon={<AddAlertIcon />}
          onClick={() => setReportOpen(true)}
        >
          {t.hazards.submitFlag}
        </Button>
        <Button
          variant="outlined"
          startIcon={<MyLocationIcon />}
          onClick={useLocation}
        >
          {t.hazards.useLocation}
        </Button>
      </Box>
      {showMap ? (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            {t.hazards.pickPoint}
          </Typography>
          <Box
            sx={{
              position: "relative",
              height: 240,
              mt: 1,
              borderRadius: 4,
              overflow: "hidden",
              border: 1,
              borderColor: "divider",
            }}
          >
            <MapView onClick={onPick} />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            {pointLabel ?? formatPoint(point.lat, point.lng)}
          </Typography>
        </Box>
      ) : null}
      {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mt: 2 }}>{notice}</Alert> : null}
      {loading ? (
        <Typography sx={{ mt: 2 }} color="text.secondary">
          {t.common.loading}
        </Typography>
      ) : null}
      {!loading && visible.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          {scope === "mine" ? t.hazards.myEmpty : t.hazards.empty}
        </Alert>
      ) : null}
      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {visible.map((flag) => (
          <Card key={flag.id}>
            <CardActionArea onClick={() => setSelected(flag)}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: flagStatusColor(flag.status),
                    color: "#fff",
                  }}
                >
                  <AddAlertIcon fontSize="small" />
                </Box>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2">
                    {flagTypeLabel(flag.type, t)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {flag.voteCount ?? 0} {t.hazards.votes} ·{" "}
                    {flagStatusLabel(flag.status, t)}
                  </Typography>
                  {flag.note ? (
                    <Typography variant="body2" noWrap sx={{ mt: 0.25 }}>
                      {flag.note}
                    </Typography>
                  ) : null}
                </Box>
                <Chip
                  size="small"
                  label={flagStatusLabel(flag.status, t)}
                  sx={{ bgcolor: flagStatusColor(flag.status), color: "#fff" }}
                />
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
      <FlagDetailSheet
        flag={selected}
        isOwn={selected?.reporterId === uid}
        busy={actionBusy}
        voted={
          selected !== null &&
          (votedIds.has(selected.id) || hasVoted(selected.id))
        }
        denied={
          selected !== null &&
          (deniedIds.has(selected.id) || hasDenied(selected.id))
        }
        onClose={() => setSelected(null)}
        onConfirm={(flagId) => void onConfirm(flagId)}
        onDeny={(flagId) => void onDeny(flagId)}
        onRemove={(flagId) => void onRemove(flagId)}
        onChat={(flag) => setChatFlag(flag)}
      />
      <FlagSheet
        open={reportOpen}
        lat={point.lat}
        lng={point.lng}
        busy={false}
        uid={uid ?? ""}
        onClose={() => setReportOpen(false)}
        onSubmit={(report) => void onReport(report)}
      />
      {chatFlag ? (
        <ChatDialog
          scope="HAZARD"
          refId={chatFlag.id}
          title={flagTypeLabel(chatFlag.type, t)}
          onClose={() => setChatFlag(null)}
        />
      ) : null}
    </Screen>
  );
}
