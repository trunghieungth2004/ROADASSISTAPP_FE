import { useEffect, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import { type AdminFlag } from "../../api/flags";
import MapView from "../../components/MapView";
import { flagStatusColor } from "../../components/flagStatus";
import { circlePolygon } from "../../map/geo";

const SOURCE_ID = "admin-flags";
const LAYER_ID = "admin-flags-fill";

function dot(color: string, selected: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = selected ? "26px" : "20px";
  el.style.height = selected ? "26px" : "20px";
  el.style.borderRadius = "9999px";
  el.style.background = color;
  el.style.border = selected ? "3px solid #111111" : "2px solid #ffffff";
  el.style.boxShadow = "0 1px 4px rgba(0,0,0,.4)";
  el.style.cursor = "pointer";
  return el;
}

export default function AdminFlagMap({
  flags,
  selectedId,
  onSelect,
}: {
  flags: AdminFlag[];
  selectedId: string | null;
  onSelect: (flag: AdminFlag) => void;
}) {
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const markersRef = useRef<maptilersdk.Marker[]>([]);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const marker of markersRef.current) {
      marker.remove();
    }
    markersRef.current = [];
    const features = flags.map((flag) => ({
      type: "Feature" as const,
      properties: { id: flag.id, color: flagStatusColor(flag.status) },
      geometry: {
        type: "Polygon" as const,
        coordinates: circlePolygon(flag.lat, flag.lng, flag.radiusMeters ?? 200),
      },
    }));
    const data = { type: "FeatureCollection" as const, features };
    const existing = map.getSource(SOURCE_ID);
    if (existing) {
      (existing as maptilersdk.GeoJSONSource).setData(data);
    } else {
      map.addSource(SOURCE_ID, { type: "geojson", data });
      map.addLayer({
        id: LAYER_ID,
        type: "fill",
        source: SOURCE_ID,
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.22,
        },
      });
    }
    for (const flag of flags) {
      const marker = new maptilersdk.Marker({
        element: dot(flagStatusColor(flag.status), flag.id === selectedId),
      })
        .setLngLat([flag.lng, flag.lat])
        .addTo(map);
      marker.getElement().addEventListener("click", (event) => {
        event.stopPropagation();
        selectRef.current(flag);
      });
      markersRef.current.push(marker);
    }
    const selected = flags.find((flag) => flag.id === selectedId);
    if (selected) {
      map.easeTo({ center: [selected.lng, selected.lat], duration: 400 });
    } else if (flags.length > 0) {
      const bounds = new maptilersdk.LngLatBounds();
      for (const flag of flags) {
        bounds.extend([flag.lng, flag.lat]);
      }
      map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 400 });
    }
  }, [flags, selectedId, ready]);

  useEffect(() => {
    return () => {
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
    };
  }, []);

  return (
    <MapView
      onLoad={(map) => {
        mapRef.current = map;
        setReady(true);
      }}
    />
  );
}
