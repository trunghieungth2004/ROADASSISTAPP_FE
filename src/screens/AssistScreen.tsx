import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Fab from "@mui/material/Fab";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SosIcon from "@mui/icons-material/Sos";
import * as maptilersdk from "@maptiler/sdk";
import { toMessage } from "../api/client";
import {
  advanceTicket,
  createTicket,
  fetchStatuses,
  getTicket,
  selectShop,
  ticketOffers,
  type DispatchTicket,
  type StatusEntry,
  type TicketType,
} from "../api/dispatch";
import { reverseGeocode, type Place } from "../api/places";
import { submitRating, type RatingTarget } from "../api/ratings";
import { nearShops, type Shop } from "../api/shops";
import MapView, { type MapClick } from "../components/MapView";
import PlaceField from "../components/PlaceField";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { useStrings } from "../context/LanguageContext";
import {
  shopTypeLabel,
  ticketTypeLabel,
  vehicleTypeLabel,
} from "../i18n/labels";
import { usePlaceSearch } from "../hooks/usePlaceSearch";

const TICKET_TYPES: TicketType[] = ["MECHANIC", "TOW", "SOS"];
const LAST_TICKET_KEY = "roadassist.lastTicket";
const OFFER_KINDS = ["SHOP", "MOBILE", "TOW"] as const;

type Point = { lat: number; lng: number; label?: string };

function openLabel(
  openNow: boolean | null | undefined,
  t: { open: string; closed: string; hoursUnknown: string },
): string {
  if (openNow === true) {
    return t.open;
  }
  if (openNow === false) {
    return t.closed;
  }
  return t.hoursUnknown;
}

function fitLabel(
  fits: boolean | null | undefined,
  t: { fitsAlley: string; noFit: string; fitUnknown: string },
): string {
  if (fits === true) {
    return t.fitsAlley;
  }
  if (fits === false) {
    return t.noFit;
  }
  return t.fitUnknown;
}

export default function AssistScreen() {
  const { t, lang } = useStrings();
  const { token, uid } = useAuth();
  const { activeVehicle: vehicle, vehicles, activateVehicle } = useProfile();
  const navigate = useNavigate();
  const destSearch = usePlaceSearch(lang);
  const [map, setMap] = useState<maptilersdk.Map | null>(null);
  const [assistOn, setAssistOn] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [ticketType, setTicketType] = useState<TicketType>("MECHANIC");
  const [point, setPoint] = useState<Point | null>(null);
  const [pickDest, setPickDest] = useState(false);
  const [dest, setDest] = useState<Point | null>(null);
  const [destShopId, setDestShopId] = useState("");
  const [note, setNote] = useState("");
  const [ticket, setTicket] = useState<DispatchTicket | null>(null);
  const [lookupId, setLookupId] = useState(
    () => localStorage.getItem(LAST_TICKET_KEY) ?? "",
  );
  const [statuses, setStatuses] = useState<StatusEntry[]>([]);
  const [walk, setWalk] = useState<Shop[]>([]);
  const [destShops, setDestShops] = useState<Shop[]>([]);
  const [offerKind, setOfferKind] =
    useState<(typeof OFFER_KINDS)[number]>("TOW");
  const [offers, setOffers] = useState<
    Array<{ id: string; name: string; fitsAlley?: boolean | null } & Record<
      string,
      unknown
    >>
  >([]);
  const [score, setScore] = useState("5");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const markers = useRef<maptilersdk.Marker[]>([]);

  useEffect(() => {
    if (token) {
      fetchStatuses(token)
        .then((all) => setStatuses(all.dispatch ?? []))
        .catch(() => setStatuses([]));
    }
  }, [token]);

  useEffect(
    () => () => {
      for (const m of markers.current) {
        m.remove();
      }
      markers.current = [];
    },
    [],
  );

  const drawMarkers = useCallback(
    (m: maptilersdk.Map | null, at: Point | null, to: Point | null) => {
      if (!m) {
        return;
      }
      for (const old of markers.current) {
        old.remove();
      }
      markers.current = [];
      if (at) {
        markers.current.push(
          new maptilersdk.Marker({ color: "#e11d48" })
            .setLngLat([at.lng, at.lat])
            .addTo(m),
        );
      }
      if (to) {
        markers.current.push(
          new maptilersdk.Marker({ color: "#0284c7" })
            .setLngLat([to.lng, to.lat])
            .addTo(m),
        );
      }
    },
    [],
  );

  useEffect(() => {
    drawMarkers(map, point, dest);
  }, [map, point, dest, drawMarkers]);

  async function labelFor(lat: number, lng: number): Promise<string> {
    const hit = await reverseGeocode(lat, lng, lang);
    return hit?.label ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  const onMapClick = useCallback(
    (p: MapClick) => {
      if (!assistOn) {
        return;
      }
      void (async () => {
        const label = await labelFor(p.lat, p.lng);
        if (pickDest) {
          setDest({ lat: p.lat, lng: p.lng, label });
          destSearch.pin(label);
          setDestShopId("");
          setPickDest(false);
        } else {
          setPoint({ lat: p.lat, lng: p.lng, label });
        }
      })();
    },
    [assistOn, pickDest, destSearch, lang],
  );

  function onAssistFab() {
    if (!assistOn && !point) {
      setChooserOpen(true);
      return;
    }
    setAssistOn(!assistOn);
  }

  function chooseHelp(next: TicketType) {
    setTicketType(next);
    setChooserOpen(false);
    setAssistOn(true);
  }

  function useLocation() {
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const at = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPoint(at);
        map?.flyTo({ center: [at.lng, at.lat], zoom: 15 });
        void labelFor(at.lat, at.lng).then((label) =>
          setPoint({ ...at, label }),
        );
      },
      (err) => setError(err.message),
      { timeout: 8000 },
    );
  }

  function onPickDestPlace(place: Place | null) {
    if (!place) {
      return;
    }
    setDest({ lat: place.lat, lng: place.lng, label: place.label });
    setDestShopId("");
  }

  async function onPickVehicle(profileId: string) {
    if (!profileId || profileId === vehicle?.id) {
      return;
    }
    try {
      await activateVehicle(profileId);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onCreate() {
    if (!token || !point) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const created = await createTicket(
        {
          ticketType,
          lat: point.lat,
          lng: point.lng,
          note: note || undefined,
          destinationShopId: destShopId || undefined,
          destinationPoint:
            !destShopId && dest
              ? {
                  lat: dest.lat,
                  lng: dest.lng,
                  label: dest.label,
                }
              : undefined,
          vehicleType: vehicle?.type,
          vehicleWidth: vehicle?.baseWidth,
        },
        token,
      );
      setTicket(created);
      setLookupId(created.id);
      localStorage.setItem(LAST_TICKET_KEY, created.id);
      setAssistOn(false);
      setNotice(t.dispatch.created);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onLookup(id?: string) {
    const target = id ?? lookupId;
    if (!token || !target) {
      return;
    }
    setError(null);
    try {
      const found = await getTicket(target, token);
      setTicket(found);
      setLookupId(found.id);
      localStorage.setItem(LAST_TICKET_KEY, found.id);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onAdvance(status: string) {
    if (!token || !ticket) {
      return;
    }
    setError(null);
    try {
      await advanceTicket(ticket.id, status, token);
      await onLookup(ticket.id);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onWalk() {
    if (!token || !ticket) {
      return;
    }
    setError(null);
    try {
      const [repair, mobile] = await Promise.all([
        nearShops(
          {
            lat: ticket.lat,
            lng: ticket.lng,
            radiusMeters: 1500,
            type: "SHOP",
            acceptingOnly: true,
            openOnly: true,
            limit: 5,
          },
          token,
        ),
        nearShops(
          {
            lat: ticket.lat,
            lng: ticket.lng,
            radiusMeters: 2000,
            type: "MOBILE",
            acceptingOnly: true,
            limit: 5,
          },
          token,
        ),
      ]);
      setWalk([...repair, ...mobile]);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onLoadDestShops() {
    if (!token || !ticket) {
      return;
    }
    setError(null);
    try {
      setDestShops(
        await nearShops(
          {
            lat: ticket.lat,
            lng: ticket.lng,
            radiusMeters: 5000,
            type: "SHOP",
            acceptingOnly: true,
            limit: 10,
          },
          token,
        ),
      );
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onOffers() {
    if (!token || !ticket) {
      return;
    }
    setError(null);
    try {
      setOffers(
        (await ticketOffers(
          {
            lat: ticket.lat,
            lng: ticket.lng,
            radiusMeters: 5000,
            kind: offerKind,
            limit: 10,
            accessWidthMeters: ticket.accessWidthMeters ?? undefined,
          },
          token,
        )) as Array<
          { id: string; name: string; fitsAlley?: boolean | null } & Record<
            string,
            unknown
          >
        >,
      );
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onSelect(shopId: string) {
    if (!token || !ticket) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await selectShop(ticket.id, shopId, token);
      await onLookup(ticket.id);
      setNotice(t.dispatch.selected);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onRate(targetId: string, targetKind: RatingTarget) {
    if (!token || !ticket) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await submitRating(
        { targetId, targetKind, ticketId: ticket.id, score: Number(score) },
        token,
      );
      await onLookup(ticket.id);
      setNotice(t.dispatch.rated);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  const statusName =
    statuses.find((s) => s.code === ticket?.status)?.name ?? ticket?.status;
  const helperTarget = ticket?.assignedUid
    ? { id: ticket.assignedUid, kind: "VOLUNTEER" as RatingTarget }
    : ticket?.assignedShopId
      ? { id: ticket.assignedShopId, kind: "SHOP" as RatingTarget }
      : ticket?.destinationShopId
        ? { id: ticket.destinationShopId, kind: "SHOP" as RatingTarget }
        : null;
  const isRider = ticket != null && uid != null && ticket.userId === uid;
  const resolved = ticket?.status === "4";
  const destSummary =
    ticket?.destinationSnapshot?.name ??
    ticket?.destinationSnapshot?.label ??
    null;

  return (
    <Box sx={{ position: "absolute", inset: 0 }}>
      <MapView onLoad={setMap} onClick={onMapClick} />
      <Fab
        variant="extended"
        color={assistOn ? "secondary" : "primary"}
        sx={{ position: "absolute", top: 16, left: 16 }}
        onClick={onAssistFab}
      >
        <SosIcon sx={{ mr: 1 }} />
        {t.dispatch.assistMode}
      </Fab>
      {assistOn && (
        <Chip
          label={
            pickDest ? t.dispatch.destinationHint : t.dispatch.assistHint
          }
          color="secondary"
          sx={{ position: "absolute", top: 72, left: 16 }}
        />
      )}
      <Box
        sx={{
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 12,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <Card sx={{ width: "100%", maxHeight: "55dvh", overflowY: "auto" }}>
          <CardContent
            sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
          >
            {error && <Alert severity="error">{error}</Alert>}
            {notice && <Alert severity="success">{notice}</Alert>}
            {!ticket && (
              <Box
                sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
              >
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <Chip
                      label={ticketTypeLabel(ticketType, t)}
                      size="small"
                      color="primary"
                    />
                    {vehicles.length > 0 ? (
                      <TextField
                        select
                        size="small"
                        label={t.dispatch.myVehicle}
                        value={vehicle?.id ?? ""}
                        onChange={(e) => void onPickVehicle(e.target.value)}
                        sx={{ minWidth: 180, flexGrow: 1 }}
                      >
                        {vehicles.map((v) => (
                          <MenuItem key={v.id} value={v.id}>
                            {vehicleTypeLabel(v.type, t)} · {v.baseWidth} m
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {t.dispatch.noVehicle}
                      </Typography>
                    )}
                    {vehicles.length === 0 && (
                      <Button size="small" onClick={() => navigate("/vehicle")}>
                        {t.tabs.vehicle}
                      </Button>
                    )}
                </Box>
                {point ? (
                  <Typography variant="body2">
                    {point.label ??
                      `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t.dispatch.assistHint}
                  </Typography>
                )}
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button variant="outlined" onClick={useLocation}>
                    {t.dispatch.useLocation}
                  </Button>
                  <Button
                    variant="contained"
                    disabled={!point}
                    onClick={() => void onCreate()}
                  >
                    {t.dispatch.createAt}
                  </Button>
                </Box>
                <TextField
                  label={t.dispatch.note}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  fullWidth
                />
                {ticketType === "TOW" && (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <PlaceField
                      point="B"
                      title={t.dispatch.destinationSearch}
                      placeholder={t.dispatch.destinationHint}
                      search={destSearch}
                      onSelect={onPickDestPlace}
                      searchingText={t.route.searching}
                      noResultsText={t.route.noResults}
                      emptyHint={t.route.tapToSet}
                      pickActive={pickDest}
                      pickLabel={t.route.pickOnMap}
                      onPickMap={() => setPickDest(!pickDest)}
                      savedHeader={t.route.savedPlaces}
                      directoryHeader={t.route.directory}
                      mapHeader={t.route.mapResults}
                      savedCoords={new Set<string>()}
                      saveTitle={t.route.savePlace}
                      canSavePin={false}
                    />
                    {dest && (
                      <Typography variant="body2">
                        {t.dispatch.destination}:{" "}
                        {dest.label ??
                          `${dest.lat.toFixed(5)}, ${dest.lng.toFixed(5)}`}
                      </Typography>
                    )}
                  </Box>
                )}
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    label={t.dispatch.ticketId}
                    value={lookupId}
                    onChange={(e) => setLookupId(e.target.value)}
                    fullWidth
                  />
                  <Button variant="outlined" onClick={() => void onLookup()}>
                    {t.common.retry}
                  </Button>
                </Box>
              </Box>
            )}
            {ticket && (
              <Box
                sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="subtitle2">
                    {ticketTypeLabel(ticket.ticketType, t)}
                  </Typography>
                  <Chip
                    label={`${t.dispatch.statusNames}: ${statusName}`}
                    size="small"
                    color="success"
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {ticket.lat.toFixed(5)}, {ticket.lng.toFixed(5)}
                  {ticket.vehicleType &&
                    ` · ${vehicleTypeLabel(ticket.vehicleType, t)} ${ticket.vehicleWidth ?? ""}`}
                </Typography>
                {ticket.note && (
                  <Typography variant="body2">{ticket.note}</Typography>
                )}
                {ticket.accessWidthMeters != null && (
                  <Typography variant="body2">
                    {t.dispatch.clearance}: {ticket.accessWidthMeters} m
                  </Typography>
                )}
                {destSummary != null && (
                  <Typography variant="body2">
                    {t.dispatch.destination}: {String(destSummary)}
                  </Typography>
                )}
                {(ticket.assignedUid || ticket.assignedShopId) && (
                  <Typography variant="body2">
                    {t.dispatch.assigned}:{" "}
                    {ticket.assignedUid ?? ticket.assignedShopId}
                  </Typography>
                )}
                {statuses.length > 0 && (
                  <Box
                    sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                  >
                    {statuses
                      .filter((s) => s.code !== ticket.status)
                      .map((s) => (
                        <Chip
                          key={s.code}
                          label={`${t.dispatch.advance}: ${s.name}`}
                          size="small"
                          onClick={() => void onAdvance(s.code)}
                        />
                      ))}
                  </Box>
                )}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => void onWalk()}
                >
                  {t.dispatch.walkLoad}
                </Button>
                {walk.map((s) => (
                  <Box
                    key={s.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Box>
                      <Typography variant="body2">{s.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {shopTypeLabel(s.type, t)}
                        {s.distance != null && ` · ${Math.round(s.distance)} m`}
                        {s.ratingCount != null &&
                          s.ratingCount > 0 &&
                          ` · ★${s.ratingAvg?.toFixed(1)}`}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={openLabel(s.openNow, t.dispatch)}
                      color={s.openNow === true ? "success" : "default"}
                    />
                  </Box>
                ))}
                {ticket.status === "1" && (
                  <Box>
                    <Typography variant="subtitle2">
                      {t.dispatch.offers}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                      <TextField
                        select
                        size="small"
                        value={offerKind}
                        onChange={(e) =>
                          setOfferKind(
                            e.target.value as (typeof OFFER_KINDS)[number],
                          )
                        }
                      >
                        {OFFER_KINDS.map((k) => (
                          <MenuItem key={k} value={k}>
                            {shopTypeLabel(k, t)}
                          </MenuItem>
                        ))}
                      </TextField>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => void onOffers()}
                      >
                        {t.dispatch.offersLoad}
                      </Button>
                    </Box>
                    {offers.map((o) => (
                      <Box
                        key={o.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1,
                          mt: 1,
                        }}
                      >
                        <Box>
                          <Typography variant="body2">{o.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {fitLabel(
                              o.fitsAlley as boolean | null | undefined,
                              t.dispatch,
                            )}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => void onSelect(o.id)}
                        >
                          {t.dispatch.select}
                        </Button>
                      </Box>
                    ))}
                    <Button
                      size="small"
                      sx={{ mt: 1 }}
                      onClick={() => void onLoadDestShops()}
                    >
                      {t.dispatch.pickDestination}
                    </Button>
                    {destShops.map((s) => (
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
                        <Typography variant="body2">{s.name}</Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => void onSelect(s.id)}
                        >
                          {t.dispatch.select}
                        </Button>
                      </Box>
                    ))}
                  </Box>
                )}
                {resolved && isRider && helperTarget && (
                  <Box>
                    <Typography variant="subtitle2">
                      {t.dispatch.rateHelper}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                      <TextField
                        select
                        size="small"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                      >
                        {["5", "4", "3", "2", "1"].map((v) => (
                          <MenuItem key={v} value={v}>
                            {v}
                          </MenuItem>
                        ))}
                      </TextField>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          void onRate(helperTarget.id, helperTarget.kind)
                        }
                      >
                        {t.dispatch.rateSend}
                      </Button>
                    </Box>
                  </Box>
                )}
                {resolved && !isRider && (
                  <Box>
                    <Typography variant="subtitle2">
                      {t.dispatch.rateRider}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                      <TextField
                        select
                        size="small"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                      >
                        {["5", "4", "3", "2", "1"].map((v) => (
                          <MenuItem key={v} value={v}>
                            {v}
                          </MenuItem>
                        ))}
                      </TextField>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => void onRate(ticket.userId, "RIDER")}
                      >
                        {t.dispatch.rateSend}
                      </Button>
                    </Box>
                  </Box>
                )}
                <Button size="small" onClick={() => setTicket(null)}>
                  {t.dispatch.newTicket}
                </Button>
              </Box>
            )}
            <Button size="small" onClick={() => navigate("/volunteer")}>
              {t.dispatch.radar}
            </Button>
          </CardContent>
        </Card>
      </Box>
      <Dialog open={chooserOpen} onClose={() => setChooserOpen(false)}>
        <DialogTitle>{t.dispatch.chooseHelp}</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 1, pt: 1 }}
        >
          {TICKET_TYPES.map((v) => (
            <Button
              key={v}
              variant={ticketType === v ? "contained" : "outlined"}
              onClick={() => chooseHelp(v)}
              sx={{ justifyContent: "flex-start" }}
            >
              {v === "MECHANIC"
                ? `${t.dispatch.mechanic} — ${t.dispatch.mechanicHint}`
                : v === "TOW"
                  ? `${t.dispatch.tow} — ${t.dispatch.towHint}`
                  : `${t.dispatch.sos} — ${t.dispatch.sosHint}`}
            </Button>
          ))}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
