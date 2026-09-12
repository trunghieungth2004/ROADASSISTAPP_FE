import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as maptilersdk from "@maptiler/sdk";
import { type ApiFailure } from "../api/client";
import {
  listSavedPlaces,
  placeKey,
  removeSavedPlace,
  savePlace,
  searchDirectory,
  type Place,
  type SavedPlace,
} from "../api/places";
import {
  findRoute,
  getSavedRoute,
  isHazardZone,
  isWidthBlock,
  type HazardZone,
  type LatLng,
  type RouteOption,
  type WidthBlock,
} from "../api/routes";
import { getRoutingWidth, setRoutingWidth } from "../storage/vehicleWidth";
import { dot, drawRoutes, drawZones, formatCoord, handle } from "../services/routeView";
import { usePlaceSearch, type PlaceSearch } from "./usePlaceSearch";

export type PickMode = "origin" | "dest" | "stop" | "flag" | null;

export type PlannerFailure = {
  message: string;
  zones: HazardZone[];
  blocks: WidthBlock[];
};

type UseRoutePlannerArgs = {
  token: string | null;
  lang: string;
  needPointsMessage: string;
};

export type RoutePlanner = {
  mode: PickMode;
  setMode: (mode: PickMode) => void;
  origin: LatLng | null;
  dest: LatLng | null;
  stops: LatLng[];
  setStops: Dispatch<SetStateAction<LatLng[]>>;
  width: string;
  setWidth: (width: string) => void;
  routes: RouteOption[];
  selected: number;
  setSelected: (index: number) => void;
  result: RouteOption | null;
  failure: PlannerFailure | null;
  busy: boolean;
  loadedSaved: boolean;
  originSearch: PlaceSearch;
  destSearch: PlaceSearch;
  stopSearch: PlaceSearch;
  originLabel: string | null;
  destLabel: string | null;
  savedCoords: Set<string>;
  savedIdFor: (place: Place) => string | null;
  addSaved: (place: {
    label: string;
    lat: number;
    lng: number;
  }) => Promise<SavedPlace>;
  removeSaved: (placeId: string) => Promise<{ deleted: number }>;
  savePoint: (which: "origin" | "dest") => Promise<SavedPlace>;
  map: maptilersdk.Map | null;
  mapReady: boolean;
  onLoad: (map: maptilersdk.Map) => void;
  onMapPoint: (p: LatLng) => void;
  pickOrigin: (place: Place | null) => void;
  pickDest: (place: Place | null) => void;
  pickStop: (place: Place | null) => void;
  swapPoints: () => void;
  onFind: () => void;
  reroute: () => void;
  clearAll: () => void;
};

export function useRoutePlanner({
  token,
  lang,
  needPointsMessage,
}: UseRoutePlannerArgs): RoutePlanner {
  const navigate = useNavigate();
  const location = useLocation();
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const markersRef = useRef<maptilersdk.Marker[]>([]);
  const [mapInstance, setMapInstance] = useState<maptilersdk.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mode, setMode] = useState<PickMode>(null);
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [dest, setDest] = useState<LatLng | null>(null);
  const [stops, setStops] = useState<LatLng[]>([]);
  const [width, setWidth] = useState(() => String(getRoutingWidth()));
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selected, setSelected] = useState(0);
  const result = routes[selected] ?? null;
  const [failure, setFailure] = useState<PlannerFailure | null>(null);
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [loadedSaved, setLoadedSaved] = useState(false);
  const [originLabel, setOriginLabel] = useState<string | null>(null);
  const [destLabel, setDestLabel] = useState<string | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);

  const savedGetter = useCallback(
    (): Place[] =>
      savedPlaces.map((p) => ({
        label: p.label,
        lat: p.lat,
        lng: p.lng,
        source: "saved",
        id: p.id,
      })),
    [savedPlaces],
  );

  const savedCoords = useMemo(
    () => new Set(savedPlaces.map((p) => placeKey(p))),
    [savedPlaces],
  );

  const originSearch = usePlaceSearch(lang, {
    onEmpty: () => setOrigin(null),
    localSource: token ? (q) => searchDirectory(q, token) : undefined,
    saved: savedGetter,
  });
  const destSearch = usePlaceSearch(lang, {
    onEmpty: () => setDest(null),
    localSource: token ? (q) => searchDirectory(q, token) : undefined,
    saved: savedGetter,
  });
  const stopSearch = usePlaceSearch(lang, {
    localSource: token ? (q) => searchDirectory(q, token) : undefined,
    saved: savedGetter,
  });

  useEffect(() => {
    if (!token) {
      setSavedPlaces([]);
      return;
    }
    let alive = true;
    listSavedPlaces(token)
      .then((list) => {
        if (alive) {
          setSavedPlaces(list);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [token]);

  function refreshSearches() {
    originSearch.refreshSaved();
    destSearch.refreshSaved();
    stopSearch.refreshSaved();
  }

  async function requestRoute(o: LatLng, d: LatLng, s: LatLng[]) {
    setBusy(true);
    setRoutes([]);
    setSelected(0);
    setFailure(null);
    try {
      const w = Number(width);
      if (Number.isFinite(w) && w > 0) {
        setRoutingWidth(w);
      }
      const res = await findRoute(
        {
          originLat: o.lat,
          originLng: o.lng,
          destLat: d.lat,
          destLng: d.lng,
          stops: s,
          width: Number.isFinite(w) && w > 0 ? w : undefined,
        },
        token ?? "",
      );
      setRoutes(res.routes);
      setSelected(0);
    } catch (err) {
      const f = err as ApiFailure;
      const list = Array.isArray(f.errors) ? f.errors : [];
      setFailure({
        message: f.message,
        zones: list.filter(isHazardZone),
        blocks: list.filter(isWidthBlock),
      });
    } finally {
      setBusy(false);
    }
  }

  const loadSavedRoute = useCallback(
    async (routeId: string, authToken: string) => {
      setBusy(true);
      setRoutes([]);
      setSelected(0);
      setFailure(null);
      try {
        const saved = await getSavedRoute(routeId, authToken);
        setOrigin({ lat: saved.originLat, lng: saved.originLng });
        setDest({ lat: saved.destLat, lng: saved.destLng });
        setStops(saved.stops ?? []);
        setOriginLabel(null);
        setDestLabel(null);
        originSearch.pin(
          formatCoord({ lat: saved.originLat, lng: saved.originLng }),
        );
        destSearch.pin(formatCoord({ lat: saved.destLat, lng: saved.destLng }));
        if (saved.width != null) {
          setWidth(String(saved.width));
        }
        const source =
          saved.source === "cache" || saved.source === "detour"
            ? saved.source
            : "osrm";
        setRoutes([
          {
            distanceMeters: saved.distanceMeters ?? 0,
            durationSeconds: saved.durationSeconds ?? 0,
            geometry: saved.geometry,
            source,
            via: saved.via ?? undefined,
            hazards: saved.hazards ?? undefined,
          },
        ]);
        setSelected(0);
        setLoadedSaved(true);
      } catch (err) {
        const f = err as ApiFailure;
        setFailure({ message: f.message, zones: [], blocks: [] });
      } finally {
        setBusy(false);
      }
    },
    [originSearch, destSearch],
  );

  useEffect(() => {
    const state = location.state as {
      flagMode?: boolean;
      savedRouteId?: string;
    } | null;
    if (state?.flagMode) {
      setMode("flag");
    }
    if (state?.savedRouteId && token) {
      void loadSavedRoute(state.savedRouteId, token);
    }
    if (state?.flagMode || state?.savedRouteId) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate, token, loadSavedRoute]);

  const onLoad = useCallback((map: maptilersdk.Map) => {
    mapRef.current = map;
    setMapInstance(map);
    setMapReady(true);
  }, []);

  const onMapPoint = useCallback(
    (p: LatLng) => {
      if (mode === "origin") {
        const next = { lat: p.lat, lng: p.lng };
        setOrigin(next);
        setOriginLabel(null);
        originSearch.pin(formatCoord(next));
        setMode(null);
      } else if (mode === "dest") {
        const next = { lat: p.lat, lng: p.lng };
        setDest(next);
        setDestLabel(null);
        destSearch.pin(formatCoord(next));
        setMode(null);
      } else if (mode === "stop" && stops.length < 10) {
        setStops((prev) => [...prev, { lat: p.lat, lng: p.lng }]);
      }
    },
    [mode, stops.length, originSearch, destSearch],
  );

  function pickOrigin(place: Place | null) {
    if (!place) {
      return;
    }
    const next = { lat: place.lat, lng: place.lng };
    setOrigin(next);
    setOriginLabel(place.label);
    originSearch.pin(place.label);
    mapRef.current?.flyTo({ center: [place.lng, place.lat], zoom: 15 });
    if (result && dest) {
      void requestRoute(next, dest, stops);
    }
  }

  function pickDest(place: Place | null) {
    if (!place) {
      return;
    }
    const next = { lat: place.lat, lng: place.lng };
    setDest(next);
    setDestLabel(place.label);
    destSearch.pin(place.label);
    mapRef.current?.flyTo({ center: [place.lng, place.lat], zoom: 15 });
    if (result && origin) {
      void requestRoute(origin, next, stops);
    }
  }

  function pickStop(place: Place | null) {
    if (!place || stops.length >= 10) {
      return;
    }
    const next = [...stops, { lat: place.lat, lng: place.lng }];
    setStops(next);
    stopSearch.pin(place.label);
    mapRef.current?.flyTo({ center: [place.lng, place.lat], zoom: 15 });
    if (result && origin && dest) {
      void requestRoute(origin, dest, next);
    }
  }

  function savedIdFor(place: Place): string | null {
    if (place.id) {
      const hit = savedPlaces.find((p) => p.id === place.id);
      if (hit) {
        return hit.id;
      }
    }
    const key = placeKey(place);
    return savedPlaces.find((p) => placeKey(p) === key)?.id ?? null;
  }

  async function addSaved(place: {
    label: string;
    lat: number;
    lng: number;
  }): Promise<SavedPlace> {
    if (!token) {
      throw new Error("Authentication required");
    }
    const created = await savePlace(
      { label: place.label.trim(), lat: place.lat, lng: place.lng },
      token,
    );
    setSavedPlaces((prev) => {
      const rest = prev.filter((p) => p.id !== created.id);
      return [created, ...rest];
    });
    refreshSearches();
    return created;
  }

  async function removeSaved(placeId: string): Promise<{ deleted: number }> {
    if (!token) {
      throw new Error("Authentication required");
    }
    const res = await removeSavedPlace(placeId, token);
    setSavedPlaces((prev) => prev.filter((p) => p.id !== placeId));
    refreshSearches();
    return res;
  }

  async function savePoint(which: "origin" | "dest"): Promise<SavedPlace> {
    const point = which === "origin" ? origin : dest;
    if (!point) {
      throw new Error("No point to save");
    }
    const fallback = formatCoord(point);
    const label =
      (which === "origin" ? originLabel : destLabel) ?? fallback;
    return addSaved({ label, lat: point.lat, lng: point.lng });
  }

  function swapPoints() {
    const nextOrigin = dest;
    const nextDest = origin;
    setOrigin(nextOrigin);
    setDest(nextDest);
    setOriginLabel(destLabel);
    setDestLabel(originLabel);
    originSearch.pin(destSearch.input);
    destSearch.pin(originSearch.input);
    if (result && nextOrigin && nextDest) {
      void requestRoute(nextOrigin, nextDest, stops);
    } else {
      setRoutes([]);
      setSelected(0);
      setFailure(null);
    }
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }
    for (const m of markersRef.current) {
      m.remove();
    }
    markersRef.current = [];
    const track = (mk: maptilersdk.Marker) => {
      markersRef.current.push(mk);
    };
    if (origin) {
      const mk = new maptilersdk.Marker({
        element: dot("#0284c7", "A"),
        draggable: true,
      })
        .setLngLat([origin.lng, origin.lat])
        .addTo(map);
      mk.on("dragend", () => {
        if (busy) {
          setNonce((n) => n + 1);
          return;
        }
        const ll = mk.getLngLat();
        const next = { lat: ll.lat, lng: ll.lng };
        setOrigin(next);
        if (result && dest) {
          void requestRoute(next, dest, stops);
        }
      });
      track(mk);
    }
    stops.forEach((s, i) =>
      track(
        new maptilersdk.Marker({ element: dot("#2563eb", String(i + 1)) })
          .setLngLat([s.lng, s.lat])
          .addTo(map),
      ),
    );
    if (dest) {
      const mk = new maptilersdk.Marker({
        element: dot("#dc2626", "B"),
        draggable: true,
      })
        .setLngLat([dest.lng, dest.lat])
        .addTo(map);
      mk.on("dragend", () => {
        if (busy) {
          setNonce((n) => n + 1);
          return;
        }
        const ll = mk.getLngLat();
        const next = { lat: ll.lat, lng: ll.lng };
        setDest(next);
        if (result && origin) {
          void requestRoute(origin, next, stops);
        }
      });
      track(mk);
    }
    if (result && !busy) {
      const coords = result.geometry.coordinates;
      const mid = coords[Math.floor(coords.length / 2)];
      const mk = new maptilersdk.Marker({
        element: handle(),
        draggable: true,
      })
        .setLngLat([mid[0], mid[1]])
        .addTo(map);
      mk.on("dragend", () => {
        if (!origin || !dest || stops.length >= 10) {
          setNonce((n) => n + 1);
          return;
        }
        const ll = mk.getLngLat();
        const next = [...stops, { lat: ll.lat, lng: ll.lng }];
        setStops(next);
        void requestRoute(origin, dest, next);
      });
      track(mk);
    }
  }, [mapReady, origin, dest, stops, result, busy, nonce]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }
    drawRoutes(map, routes, selected);
    drawZones(map, [
      ...(result?.hazards ?? []),
      ...(failure?.zones ?? []),
    ]);
    drawZones(
      map,
      (result?.warnings ?? []).filter((z) => z.type === "WIDTH"),
      "width-tight",
      "width-tight-fill",
      "#d97706",
    );
  }, [mapReady, routes, selected, failure]);

  function onFind() {
    if (!origin || !dest) {
      setFailure({ message: needPointsMessage, zones: [], blocks: [] });
      return;
    }
    void requestRoute(origin, dest, stops);
  }

  function reroute() {
    if (!origin || !dest) {
      return;
    }
    setLoadedSaved(false);
    void requestRoute(origin, dest, stops);
  }

  function clearAll() {
    setOrigin(null);
    setDest(null);
    setStops([]);
    setRoutes([]);
    setSelected(0);
    setFailure(null);
    setLoadedSaved(false);
    setOriginLabel(null);
    setDestLabel(null);
    originSearch.pin("");
    destSearch.pin("");
  }

  return {
    mode,
    setMode,
    origin,
    dest,
    stops,
    setStops,
    width,
    setWidth,
    routes,
    selected,
    setSelected,
    result,
    failure,
    busy,
    loadedSaved,
    originSearch,
    destSearch,
    stopSearch,
    originLabel,
    destLabel,
    savedCoords,
    savedIdFor,
    addSaved,
    removeSaved,
    savePoint,
    map: mapInstance,
    mapReady,
    onLoad,
    onMapPoint,
    pickOrigin,
    pickDest,
    pickStop,
    swapPoints,
    onFind,
    reroute,
    clearAll,
  };
}
