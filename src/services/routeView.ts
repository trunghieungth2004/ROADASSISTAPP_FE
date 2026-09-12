import type { Feature, FeatureCollection, Polygon } from "geojson";
import * as maptilersdk from "@maptiler/sdk";
import { circlePolygon } from "../map/geo";
import type { HazardZone, LatLng, RouteOption } from "../api/routes";

export function formatCoord(p: LatLng): string {
  return `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
}

export function dot(color: string, label: string): HTMLDivElement {
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

export function handle(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = "30px";
  el.style.height = "30px";
  el.style.borderRadius = "9999px";
  el.style.background = "#fff";
  el.style.color = "#0284c7";
  el.style.fontSize = "16px";
  el.style.fontWeight = "700";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.border = "3px solid #0284c7";
  el.style.boxShadow = "0 1px 4px rgba(0,0,0,.4)";
  el.style.cursor = "grab";
  el.textContent = "↔";
  return el;
}

export function drawRoutes(
  map: maptilersdk.Map,
  routes: RouteOption[],
  selected: number,
): void {
  try {
    drawRoutesInner(map, routes, selected);
  } catch (err) {
    console.error(err);
  }
}

function drawRoutesInner(
  map: maptilersdk.Map,
  routes: RouteOption[],
  selected: number,
): void {
  for (let i = 0; i < 8; i++) {
    const id = `route-line-${i}`;
    if (map.getLayer(id)) {
      map.removeLayer(id);
    }
    if (map.getSource(id)) {
      map.removeSource(id);
    }
  }
  if (map.getLayer("route-line")) {
    map.removeLayer("route-line");
  }
  if (map.getSource("route")) {
    map.removeSource("route");
  }
  if (routes.length === 0) {
    return;
  }
  const order = routes.map((_, i) => i).filter((i) => i !== selected);
  if (routes[selected]) {
    order.push(selected);
  }
  const bounds = new maptilersdk.LngLatBounds();
  for (const i of order) {
    const route = routes[i];
    const active = i === selected;
    const id = `route-line-${i}`;
    const feature: Feature = {
      type: "Feature",
      properties: {},
      geometry: route.geometry,
    };
    map.addSource(id, { type: "geojson", data: feature });
    map.addLayer({
      id,
      type: "line",
      source: id,
      paint: {
        "line-color": active ? "#0284c7" : "#94a3b8",
        "line-width": active ? 6 : 3,
        "line-opacity": active ? 0.95 : 0.75,
      },
    });
    for (const [lng, lat] of route.geometry.coordinates) {
      bounds.extend([lng, lat]);
    }
  }
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, { padding: 70 });
  }
}

export function drawZones(
  map: maptilersdk.Map,
  zones: HazardZone[],
  sourceId = "hazards",
  layerId = "hazard-fill",
  color = "#dc2626",
): void {
  try {
    drawZonesInner(map, zones, sourceId, layerId, color);
  } catch (err) {
    console.error(err);
  }
}

function drawZonesInner(
  map: maptilersdk.Map,
  zones: HazardZone[],
  sourceId: string,
  layerId: string,
  color: string,
): void {
  const existing = map.getSource(sourceId);
  if (zones.length === 0) {
    if (existing && map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (existing) {
      map.removeSource(sourceId);
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
    map.addSource(sourceId, { type: "geojson", data: collection });
    map.addLayer({
      id: layerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": color,
        "fill-opacity": 0.25,
      },
    });
  }
}

function pillEl(active: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.style.background = active ? "#0284c7" : "#94a3b8";
  el.style.opacity = active ? "1" : "0.75";
  el.style.color = "#fff";
  el.style.fontSize = "15px";
  el.style.fontWeight = "700";
  el.style.whiteSpace = "nowrap";
  el.style.padding = "6px 14px";
  el.style.borderRadius = "9999px";
  el.style.border = "2px solid #fff";
  el.style.boxShadow = "0 2px 8px rgba(0,0,0,.4)";
  return el;
}

function stylePill(
  el: HTMLElement,
  active: boolean,
  onTap: (() => void) | undefined,
): void {
  el.style.background = active ? "#0284c7" : "#94a3b8";
  el.style.opacity = active ? "1" : "0.75";
  el.style.cursor = onTap ? "pointer" : "";
  el.onclick = onTap
    ? (e) => {
        e.stopPropagation();
        onTap();
      }
    : null;
}

const routePills = new Map<number, { map: maptilersdk.Map; marker: maptilersdk.Marker }>();

export function drawRoutePills(
  map: maptilersdk.Map,
  routes: RouteOption[],
  selected: number,
  textFor: (route: RouteOption) => string,
  onSelect?: (index: number) => void,
): void {
  try {
    drawRoutePillsInner(map, routes, selected, textFor, onSelect);
  } catch (err) {
    console.error(err);
  }
}

function drawRoutePillsInner(
  map: maptilersdk.Map,
  routes: RouteOption[],
  selected: number,
  textFor: (route: RouteOption) => string,
  onSelect?: (index: number) => void,
): void {
  for (const [i, pill] of routePills) {
    if (pill.map === map && i < routes.length) {
      continue;
    }
    pill.marker.remove();
    routePills.delete(i);
  }
  routes.forEach((route, i) => {
    const mid = route.geometry.coordinates[Math.floor(route.geometry.coordinates.length / 2)];
    const active = i === selected;
    const onTap =
      onSelect && !active ? () => onSelect(i) : undefined;
    const existing = routePills.get(i);
    if (!mid) {
      existing?.marker.remove();
      routePills.delete(i);
      return;
    }
    if (existing && existing.map === map) {
      existing.marker.setLngLat([mid[0], mid[1]]);
      const el = existing.marker.getElement();
      const text = textFor(route);
      if (el.textContent !== text) {
        el.textContent = text;
      }
      stylePill(el, active, onTap);
      return;
    }
    existing?.marker.remove();
    const element = pillEl(active);
    stylePill(element, active, onTap);
    const marker = new maptilersdk.Marker({
      element,
      anchor: "bottom",
      offset: [0, -14],
    })
      .setLngLat([mid[0], mid[1]])
      .addTo(map);
    marker.getElement().textContent = textFor(route);
    routePills.set(i, { map, marker });
  });
}
