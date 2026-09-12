import { useEffect, useRef } from "react";
import * as maptilersdk from "@maptiler/sdk";
import { flagsNear, type Flag } from "../api/flags";
import { circlePolygon } from "../map/geo";
import { flagStatusColor } from "./flagStatus";

const SOURCE_ID = "near-flags";
const LAYER_ID = "near-flags-fill";
const RADIUS = 3000;

type NearbyFlagsProps = {
  map: maptilersdk.Map | null;
  token: string | null;
  refreshKey: number;
  onPick: (flag: Flag) => void;
};

function dot(color: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = "22px";
  el.style.height = "22px";
  el.style.borderRadius = "9999px";
  el.style.background = color;
  el.style.border = "2px solid #fff";
  el.style.boxShadow = "0 1px 4px rgba(0,0,0,.4)";
  el.style.cursor = "pointer";
  return el;
}

export default function NearbyFlags({
  map,
  token,
  refreshKey,
  onPick,
}: NearbyFlagsProps) {
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const markersRef = useRef<maptilersdk.Marker[]>([]);
  const timerRef = useRef(0);

  useEffect(() => {
    if (!map || !token) {
      return;
    }
    let cancelled = false;
    const active = map;
    const key = token;

    async function load() {
      try {
        const center = active.getCenter();
        const flags = await flagsNear(center.lat, center.lng, RADIUS, key);
        if (cancelled) {
          return;
        }
        for (const m of markersRef.current) {
          m.remove();
        }
        markersRef.current = [];
        const features = flags.map((f) => ({
          type: "Feature" as const,
          properties: { id: f.id, color: flagStatusColor(f.status) },
          geometry: {
            type: "Polygon" as const,
            coordinates: circlePolygon(f.lat, f.lng, f.radiusMeters ?? 200),
          },
        }));
        const data = { type: "FeatureCollection" as const, features };
        const existing = active.getSource(SOURCE_ID);
        if (existing) {
          (existing as maptilersdk.GeoJSONSource).setData(data);
        } else {
          active.addSource(SOURCE_ID, { type: "geojson", data });
          active.addLayer({
            id: LAYER_ID,
            type: "fill",
            source: SOURCE_ID,
            paint: {
              "fill-color": ["get", "color"],
              "fill-opacity": 0.25,
            },
          });
        }
        for (const f of flags) {
          const mk = new maptilersdk.Marker({ element: dot(flagStatusColor(f.status)) })
            .setLngLat([f.lng, f.lat])
            .addTo(active);
          mk.getElement().addEventListener("click", (e) => {
            e.stopPropagation();
            pickRef.current(f);
          });
          markersRef.current.push(mk);
        }
      } catch {
        return;
      }
    }

    function schedule() {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => void load(), 800);
    }

    void load();
    active.on("moveend", schedule);
    return () => {
      cancelled = true;
      window.clearTimeout(timerRef.current);
      active.off("moveend", schedule);
      for (const m of markersRef.current) {
        m.remove();
      }
      markersRef.current = [];
      if (active.getLayer(LAYER_ID)) {
        active.removeLayer(LAYER_ID);
      }
      if (active.getSource(SOURCE_ID)) {
        active.removeSource(SOURCE_ID);
      }
    };
  }, [map, token, refreshKey]);

  return null;
}
