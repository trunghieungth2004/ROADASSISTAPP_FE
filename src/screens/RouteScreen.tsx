import { useCallback, useEffect, useRef, useState } from "react";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import * as maptilersdk from "@maptiler/sdk";
import { type ApiFailure } from "../api/client";
import {
  findRoute,
  isHazardZone,
  isWidthBlock,
  type HazardZone,
  type LatLng,
  type RouteSuccess,
  type WidthBlock,
} from "../api/routes";
import MapView, { type MapClick } from "../components/MapView";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";
import { circlePolygon } from "../map/geo";
import { getRoutingWidth, setRoutingWidth } from "../vehicleWidth";

type PickMode = "origin" | "dest" | "stop" | null;

type Failure = {
  message: string;
  zones: HazardZone[];
  blocks: WidthBlock[];
};

function dot(color: string, label: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = "26px";
  el.style.height = "26px";
  el.style.borderRadius = "9999px";
  el.style.background = color;
  el.style.color = "#fff";
  el.style.fontSize = "13px";
  el.style.fontWeight = "700";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.border = "2px solid #fff";
  el.style.boxShadow = "0 1px 4px rgba(0,0,0,.4)";
  el.textContent = label;
  return el;
}

function handle(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = "30px";
  el.style.height = "30px";
  el.style.borderRadius = "9999px";
  el.style.background = "#fff";
  el.style.color = "#15803d";
  el.style.fontSize = "16px";
  el.style.fontWeight = "700";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.border = "3px solid #15803d";
  el.style.boxShadow = "0 1px 4px rgba(0,0,0,.4)";
  el.style.cursor = "grab";
  el.textContent = "↔";
  return el;
}

function drawRoute(map: maptilersdk.Map, result: RouteSuccess | null): void {
  const existing = map.getSource("route");
  if (!result) {
    if (existing && map.getLayer("route-line")) {
      map.removeLayer("route-line");
    }
    if (existing) {
      map.removeSource("route");
    }
    return;
  }
  const feature: Feature = {
    type: "Feature",
    properties: {},
    geometry: result.geometry,
  };
  const source = existing as maptilersdk.GeoJSONSource | undefined;
  if (source) {
    source.setData(feature);
  } else {
    map.addSource("route", { type: "geojson", data: feature });
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      paint: {
        "line-color": "#15803d",
        "line-width": 5,
        "line-opacity": 0.9,
      },
    });
  }
  const bounds = new maptilersdk.LngLatBounds();
  for (const [lng, lat] of result.geometry.coordinates) {
    bounds.extend([lng, lat]);
  }
  map.fitBounds(bounds, { padding: 70 });
}

function drawZones(map: maptilersdk.Map, zones: HazardZone[]): void {
  const existing = map.getSource("hazards");
  if (zones.length === 0) {
    if (existing && map.getLayer("hazard-fill")) {
      map.removeLayer("hazard-fill");
    }
    if (existing) {
      map.removeSource("hazards");
    }
    return;
  }
  const collection: FeatureCollection<Polygon> = {
    type: "FeatureCollection",
    features: zones.map((z) => ({
      type: "Feature",
      properties: { flagId: z.flagId },
      geometry: {
        type: "Polygon",
        coordinates: circlePolygon(z.lat, z.lng, z.radiusMeters),
      },
    })),
  };
  const source = existing as maptilersdk.GeoJSONSource | undefined;
  if (source) {
    source.setData(collection);
  } else {
    map.addSource("hazards", { type: "geojson", data: collection });
    map.addLayer({
      id: "hazard-fill",
      type: "fill",
      source: "hazards",
      paint: {
        "fill-color": "#dc2626",
        "fill-opacity": 0.25,
      },
    });
  }
}

export default function RouteScreen() {
  const { t } = useStrings();
  const { token } = useAuth();
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const markersRef = useRef<maptilersdk.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mode, setMode] = useState<PickMode>(null);
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [dest, setDest] = useState<LatLng | null>(null);
  const [stops, setStops] = useState<LatLng[]>([]);
  const [width, setWidth] = useState(() => String(getRoutingWidth()));
  const [result, setResult] = useState<RouteSuccess | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);

  const onLoad = useCallback((map: maptilersdk.Map) => {
    mapRef.current = map;
    setMapReady(true);
  }, []);

  const onClick = useCallback(
    (p: MapClick) => {
      if (mode === "origin") {
        setOrigin({ lat: p.lat, lng: p.lng });
        setMode(null);
      } else if (mode === "dest") {
        setDest({ lat: p.lat, lng: p.lng });
        setMode(null);
      } else if (mode === "stop" && stops.length < 10) {
        setStops((prev) => [...prev, { lat: p.lat, lng: p.lng }]);
      }
    },
    [mode, stops.length],
  );

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
        element: dot("#16a34a", "A"),
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
    drawRoute(map, result);
    drawZones(map, [
      ...(result?.hazards ?? []),
      ...(failure?.zones ?? []),
    ]);
  }, [mapReady, result, failure]);

  async function requestRoute(o: LatLng, d: LatLng, s: LatLng[]) {
    setBusy(true);
    setResult(null);
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
      setResult(res);
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

  async function onFind() {
    if (!origin || !dest) {
      setFailure({ message: t.route.needPoints, zones: [], blocks: [] });
      return;
    }
    await requestRoute(origin, dest, stops);
  }

  function clearAll() {
    setOrigin(null);
    setDest(null);
    setStops([]);
    setResult(null);
    setFailure(null);
  }

  const fmt = (n: number) => n.toFixed(n < 10 ? 1 : 0);
  const pointLabel = (p: LatLng | null) =>
    p ? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` : t.route.tapToSet;
  const pickBtn = (active: boolean) =>
    `rounded-lg px-2 py-1 text-xs font-semibold ${
      active ? "bg-green-700 text-white" : "bg-neutral-100 text-neutral-700"
    }`;

  return (
    <div className="absolute inset-0">
      <MapView onLoad={onLoad} onClick={onClick} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 max-h-[55%] overflow-y-auto p-3">
        <div className="pointer-events-auto mx-auto flex max-w-md flex-col gap-2 rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs font-semibold text-neutral-500">
              {t.route.origin}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">
              {pointLabel(origin)}
            </span>
            <button
              type="button"
              onClick={() => setMode(mode === "origin" ? null : "origin")}
              className={pickBtn(mode === "origin")}
            >
              A
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs font-semibold text-neutral-500">
              {t.route.destination}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">
              {pointLabel(dest)}
            </span>
            <button
              type="button"
              onClick={() => setMode(mode === "dest" ? null : "dest")}
              className={pickBtn(mode === "dest")}
            >
              B
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs font-semibold text-neutral-500">
              {t.route.stops} ({stops.length}/10)
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap gap-1">
              {stops.map((s, i) => (
                <button
                  key={`${s.lat}-${s.lng}-${i}`}
                  type="button"
                  onClick={() =>
                    setStops((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800"
                >
                  {i + 1} ×
                </button>
              ))}
              {stops.length < 10 && (
                <button
                  type="button"
                  onClick={() => setMode(mode === "stop" ? null : "stop")}
                  className={pickBtn(mode === "stop")}
                >
                  + {t.route.addStop}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs font-semibold text-neutral-500">
              {t.route.width}
            </span>
            <input
              className="w-24 rounded-lg border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-green-700"
              type="number"
              step="0.05"
              min="0.1"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
            />
            <button
              type="button"
              onClick={onFind}
              disabled={busy}
              className="flex-1 rounded-xl bg-green-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t.route.find}
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-xl bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-600"
            >
              {t.route.clear}
            </button>
          </div>
          {result && (
            <div className="rounded-xl bg-green-50 px-3 py-2 text-sm">
              <span className="font-semibold">
                {fmt(result.distanceMeters / 1000)} {t.route.km} ·{" "}
                {fmt(result.durationSeconds / 60)} {t.route.min}
              </span>
              <span className="ml-2 rounded-full bg-green-200 px-2 py-0.5 text-xs font-semibold text-green-900">
                {result.source === "cache"
                  ? t.route.fromCache
                  : result.source === "detour"
                    ? t.route.detourLabel
                    : t.route.fresh}
              </span>
              {result.source === "detour" && result.via && (
                <p className="mt-1 text-xs text-green-800">
                  {t.route.via}: {result.via.lat.toFixed(5)},{" "}
                  {result.via.lng.toFixed(5)}
                </p>
              )}
              <p className="mt-1 text-xs text-green-800">{t.route.dragHint}</p>
            </div>
          )}
          {failure && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
              <p className="font-semibold">{failure.message}</p>
              {failure.zones.length > 0 && (
                <p className="mt-1 text-xs">
                  {t.route.blockedBy}:{" "}
                  {failure.zones
                    .map((z) => `${z.type ?? ""} (${z.radiusMeters} m)`)
                    .join(", ")}
                </p>
              )}
              {failure.blocks.length > 0 && (
                <p className="mt-1 text-xs">
                  {t.route.widthBlocked}:{" "}
                  {failure.blocks
                    .map((b) => `${b.segmentId} (${b.baseWidth} m)`)
                    .join(", ")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
