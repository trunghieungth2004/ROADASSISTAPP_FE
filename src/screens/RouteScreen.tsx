import { useCallback, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Fab from "@mui/material/Fab";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddAlertIcon from "@mui/icons-material/AddAlert";
import SaveIcon from "@mui/icons-material/Save";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import { type ApiFailure } from "../api/client";
import {
  confirmFlag,
  submitFlag,
  unflag,
  type Flag,
} from "../api/flags";
import { saveRoute, type LatLng } from "../api/routes";
import { type Place } from "../api/places";
import FlagDetailSheet from "../components/FlagDetailSheet";
import FlagSheet, { type FlagReport } from "../components/FlagSheet";
import MapView, { type MapClick } from "../components/MapView";
import NearbyFlags from "../components/NearbyFlags";
import PlaceField from "../components/PlaceField";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";
import { useRoutePlanner } from "../hooks/useRoutePlanner";
import { drawRoutePills } from "../services/routeView";
import { hasVoted, markVoted } from "../storage/votedFlags";

export default function RouteScreen() {
  const { t, lang } = useStrings();
  const { token, uid } = useAuth();
  const planner = useRoutePlanner({
    token,
    lang,
    needPointsMessage: t.route.needPoints,
  });
  const { mode, setMode } = planner;
  const [flagPoint, setFlagPoint] = useState<LatLng | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [flagBusy, setFlagBusy] = useState(false);
  const [selected, setSelected] = useState<Flag | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [flagsKey, setFlagsKey] = useState(0);
  const [snack, setSnack] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);

  const onClick = useCallback(
    (p: MapClick) => {
      if (planner.mode === "flag") {
        setFlagPoint({ lat: p.lat, lng: p.lng });
        setSheetOpen(true);
        return;
      }
      planner.onMapPoint(p);
    },
    [planner],
  );

  async function onSaveRoute() {
    const { origin, dest, stops, width, result } = planner;
    if (!token || !origin || !dest || !result) {
      return;
    }
    setSaveBusy(true);
    try {
      const w = Number(width);
      await saveRoute(
        {
          name: saveName.trim() || undefined,
          originLat: origin.lat,
          originLng: origin.lng,
          destLat: dest.lat,
          destLng: dest.lng,
          stops,
          width: Number.isFinite(w) && w > 0 ? w : undefined,
          distanceMeters: result.distanceMeters,
          durationSeconds: result.durationSeconds,
          source: result.source,
          geometry: result.geometry,
          via: result.via ?? null,
          hazards: result.hazards ?? null,
        },
        token,
      );
      setSaveOpen(false);
      setSaveName("");
      setSnack(t.route.savedMsg);
    } catch (err) {
      const f = err as ApiFailure;
      setSnack(f.message);
    } finally {
      setSaveBusy(false);
    }
  }

  async function onSubmitFlag(report: FlagReport) {
    if (!token || !flagPoint) {
      return;
    }
    setFlagBusy(true);
    try {
      await submitFlag(
        {
          type: report.type,
          lat: flagPoint.lat,
          lng: flagPoint.lng,
          note: report.note,
          radiusMeters: report.radiusMeters,
        },
        token,
      );
      setSheetOpen(false);
      setMode(null);
      setFlagsKey((k) => k + 1);
      setSnack(t.flag.reported);
    } catch (err) {
      const f = err as ApiFailure;
      setSnack(f.message);
    } finally {
      setFlagBusy(false);
    }
  }

  async function onConfirmFlag(flagId: string) {
    if (!token) {
      return;
    }
    setFlagBusy(true);
    try {
      const res = await confirmFlag(flagId, token);
      markVoted(flagId);
      setVotedIds((prev) => new Set(prev).add(flagId));
      setSelected(null);
      setFlagsKey((k) => k + 1);
      setSnack(res.alreadyVoted ? t.flag.alreadyVoted : t.flag.confirmedMsg);
    } catch (err) {
      const f = err as ApiFailure;
      setSnack(f.message);
    } finally {
      setFlagBusy(false);
    }
  }

  async function onRemoveFlag(flagId: string) {
    if (!token) {
      return;
    }
    setFlagBusy(true);
    try {
      await unflag(flagId, token);
      setSelected(null);
      setFlagsKey((k) => k + 1);
      setSnack(t.flag.removedMsg);
    } catch (err) {
      const f = err as ApiFailure;
      setSnack(f.message);
    } finally {
      setFlagBusy(false);
    }
  }

  const fmt = (n: number) => n.toFixed(n < 10 ? 1 : 0);
  const { origin, dest, stops, result, failure } = planner;

  useEffect(() => {
    const map = planner.map;
    if (!map || !planner.mapReady) {
      return;
    }
    drawRoutePills(
      map,
      planner.routes,
      planner.selected,
      (route) =>
        `${fmt(route.distanceMeters / 1000)} ${t.route.km} · ${fmt(route.durationSeconds / 60)} ${t.route.min}`,
      (i) => planner.setSelected(i),
    );
  }, [planner.map, planner.mapReady, planner.routes, planner.selected, t]);

  async function onToggleSave(place: Place) {
    if (!token) {
      return;
    }
    try {
      const id = planner.savedIdFor(place);
      if (id) {
        await planner.removeSaved(id);
        setSnack(t.route.placeUnsaved);
      } else {
        await planner.addSaved({
          label: place.label,
          lat: place.lat,
          lng: place.lng,
        });
        setSnack(t.route.placeSaved);
      }
    } catch (err) {
      setSnack((err as ApiFailure).message);
    }
  }

  async function onSavePoint(which: "origin" | "dest") {
    if (!token) {
      return;
    }
    try {
      await planner.savePoint(which);
      setSnack(t.route.placeSaved);
    } catch (err) {
      setSnack((err as ApiFailure).message);
    }
  }

  return (
    <Box sx={{ position: "absolute", inset: 0 }}>
      <MapView onLoad={planner.onLoad} onClick={onClick} />
      <NearbyFlags
        map={planner.map}
        token={token}
        refreshKey={flagsKey}
        onPick={setSelected}
      />
      <Fab
        variant="extended"
        color={mode === "flag" ? "secondary" : "primary"}
        sx={{ position: "absolute", top: 16, left: 16 }}
        onClick={() => setMode(mode === "flag" ? null : "flag")}
      >
        <AddAlertIcon sx={{ mr: 1 }} />
        {t.route.flagMode}
      </Fab>
      {mode === "flag" && (
        <Chip
          label={t.route.flagHint}
          color="secondary"
          sx={{ position: "absolute", top: 72, left: 16 }}
        />
      )}
      <Card
        sx={{
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 12,
          maxHeight: "55%",
          overflowY: "auto",
        }}
      >
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
                gap: 1,
                minWidth: 0,
              }}
            >
              <PlaceField
                point="A"
                title={t.route.origin}
                placeholder={t.route.searchOrigin}
                search={planner.originSearch}
                onSelect={planner.pickOrigin}
                searchingText={t.route.searching}
                noResultsText={t.route.noResults}
                emptyHint={t.route.tapToSet}
                pickActive={mode === "origin"}
                pickLabel={t.route.pickOnMap}
                savedHeader={t.route.savedPlaces}
                directoryHeader={t.route.directory}
                mapHeader={t.route.mapResults}
                savedCoords={planner.savedCoords}
                saveTitle={t.route.savePlace}
                onToggleSave={(p) => void onToggleSave(p)}
                canSavePin={origin !== null}
                onSavePin={() => void onSavePoint("origin")}
                onPickMap={() =>
                  setMode(mode === "origin" ? null : "origin")
                }
              />
              <PlaceField
                point="B"
                title={t.route.destination}
                placeholder={t.route.searchDestination}
                search={planner.destSearch}
                onSelect={planner.pickDest}
                searchingText={t.route.searching}
                noResultsText={t.route.noResults}
                emptyHint={t.route.tapToSet}
                pickActive={mode === "dest"}
                pickLabel={t.route.pickOnMap}
                savedHeader={t.route.savedPlaces}
                directoryHeader={t.route.directory}
                mapHeader={t.route.mapResults}
                savedCoords={planner.savedCoords}
                saveTitle={t.route.savePlace}
                onToggleSave={(p) => void onToggleSave(p)}
                canSavePin={dest !== null}
                onSavePin={() => void onSavePoint("dest")}
                onPickMap={() => setMode(mode === "dest" ? null : "dest")}
              />
            </Box>
            <IconButton
              aria-label={t.route.swap}
              onClick={planner.swapPoints}
              disabled={!origin && !dest}
              sx={{ alignSelf: "center" }}
            >
              <SwapVertIcon />
            </IconButton>
          </Box>
          {mode !== null && mode !== "flag" && (
            <Chip
              size="small"
              color="info"
              label={`${t.route.pickOnMap} · ${
                mode === "origin" ? "A" : mode === "dest" ? "B" : "+"
              }`}
              sx={{ alignSelf: "flex-start" }}
            />
          )}
          <Button
            variant={mode === "stop" ? "contained" : "outlined"}
            size="small"
            disabled={stops.length >= 10}
            onClick={() => setMode(mode === "stop" ? null : "stop")}
            sx={{ alignSelf: "flex-start" }}
          >
            + {t.route.addStop} ({stops.length}/10)
          </Button>
          <PlaceField
            point="+"
            title={t.route.stop}
            placeholder={t.route.searchStop}
            search={planner.stopSearch}
            onSelect={planner.pickStop}
            searchingText={t.route.searching}
            noResultsText={t.route.noResults}
            emptyHint={t.route.tapToSet}
            pickActive={mode === "stop"}
            pickLabel={t.route.pickOnMap}
            savedHeader={t.route.savedPlaces}
            directoryHeader={t.route.directory}
            mapHeader={t.route.mapResults}
            savedCoords={planner.savedCoords}
            saveTitle={t.route.savePlace}
            onToggleSave={(p) => void onToggleSave(p)}
            canSavePin={false}
            onPickMap={() => setMode(mode === "stop" ? null : "stop")}
          />
          {stops.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {stops.map((s, i) => (
                <Chip
                  key={`${s.lat}-${s.lng}-${i}`}
                  label={`${i + 1}`}
                  size="small"
                  color="info"
                  onDelete={() =>
                    planner.setStops((prev) =>
                      prev.filter((_, j) => j !== i),
                    )
                  }
                />
              ))}
            </Box>
          )}
          {(planner.originLabel ?? planner.destLabel) && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ alignSelf: "flex-end" }}
            >
              {t.route.geoAttribution}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title={t.route.widthHint} enterTouchDelay={0}>
              <TextField
                label={t.route.width}
                type="number"
                size="small"
                slotProps={{ htmlInput: { step: "0.05", min: "0.1" } }}
                value={planner.width}
                onChange={(e) => planner.setWidth(e.target.value)}
                sx={{ width: 130 }}
              />
            </Tooltip>
            <Button
              variant="contained"
              disabled={planner.busy}
              onClick={planner.onFind}
              sx={{ flexGrow: 1 }}
            >
              {t.route.find}
            </Button>
            <Button variant="outlined" onClick={planner.clearAll}>
              {t.route.clear}
            </Button>
          </Box>
          {result && (result.warnings ?? []).length > 0 && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              <Typography variant="subtitle2">
                {t.route.suggestedTitle}
              </Typography>
              <Typography variant="caption" sx={{ display: "block" }}>
                {(result.warnings ?? [])
                  .map(
                    (z) =>
                      `${z.type ?? ""} (${z.radiusMeters} m${z.note ? ` · ${z.note}` : ""})`,
                  )
                  .join(", ")}
              </Typography>
            </Alert>
          )}
          {failure && (
            <Alert severity="error">
              <Typography variant="subtitle2">{failure.message}</Typography>
              {failure.zones.length > 0 && (
                <Typography variant="caption" sx={{ display: "block" }}>
                  {t.route.blockedBy}:{" "}
                  {failure.zones
                    .map((z) => `${z.type ?? ""} (${z.radiusMeters} m)`)
                    .join(", ")}
                </Typography>
              )}
              {failure.blocks.length > 0 && (
                <Typography variant="caption" sx={{ display: "block" }}>
                  {t.route.widthBlocked}:{" "}
                  {failure.blocks
                    .map((b) => `${b.segmentId} (${b.baseWidth} m)`)
                    .join(", ")}
                </Typography>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>
      {result && (
        <Fab
          variant="extended"
          color="primary"
          sx={{ position: "absolute", top: 16, right: 16 }}
          onClick={() => setSaveOpen(true)}
        >
          <SaveIcon sx={{ mr: 1 }} />
          {t.route.saveRoute}
        </Fab>
      )}
      {result && planner.loadedSaved && origin && dest && (
        <Fab
          variant="extended"
          size="medium"
          color="secondary"
          sx={{ position: "absolute", top: 84, right: 16 }}
          disabled={planner.busy}
          onClick={() => planner.reroute()}
        >
          {t.route.reroute}
        </Fab>
      )}
      {planner.routes.length > 1 && (
        <Box
          sx={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 1,
          }}
        >
          {planner.routes.map((r, i) => (
            <Chip
              key={i}
              label={`${i + 1} · ${fmt(r.distanceMeters / 1000)} ${t.route.km} · ${fmt(r.durationSeconds / 60)} ${t.route.min}`}
              color={i === planner.selected ? "primary" : "default"}
              onClick={() => planner.setSelected(i)}
            />
          ))}
        </Box>
      )}
      {flagPoint && (
        <FlagSheet
          open={sheetOpen}
          lat={flagPoint.lat}
          lng={flagPoint.lng}
          busy={flagBusy}
          onClose={() => {
            setSheetOpen(false);
            setMode(null);
          }}
          onSubmit={onSubmitFlag}
        />
      )}
      <FlagDetailSheet
        flag={selected}
        isOwn={selected?.reporterId === uid}
        busy={flagBusy}
        voted={
          selected !== null &&
          (votedIds.has(selected.id) || hasVoted(selected.id))
        }
        onClose={() => setSelected(null)}
        onConfirm={onConfirmFlag}
        onRemove={onRemoveFlag}
      />
      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)} fullWidth>
        <DialogTitle>{t.route.saveRoute}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t.route.routeName}
            fullWidth
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveOpen(false)}>
            {t.common.close}
          </Button>
          <Button
            variant="contained"
            disabled={saveBusy}
            onClick={() => void onSaveRoute()}
          >
            {t.common.save}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snack !== null}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        message={snack}
      />
    </Box>
  );
}
