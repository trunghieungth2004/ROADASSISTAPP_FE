import type * as maplibregl from "maplibre-gl";
import { config } from "../config";

export const mapDefaults = {
  center: [106.6602, 10.7626] as [number, number],
  zoom: 13,
};

const TILE_ZOOM = 14;

export function brandTileUrl(): string {
  const n = 2 ** TILE_ZOOM;
  const [lng, lat] = mapDefaults.center;
  const x = Math.floor(((lng + 180) / 360) * n);
  const rad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
  );
  return config.maptilerKey
    ? `https://api.maptiler.com/maps/streets-v2/${TILE_ZOOM}/${x}/${y}.png?key=${config.maptilerKey}`
    : `https://tile.openstreetmap.org/${TILE_ZOOM}/${x}/${y}.png`;
}

const tiles = config.maptilerKey
  ? [
      `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${config.maptilerKey}`,
    ]
  : ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"];

const attribution = config.maptilerKey
  ? '© <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'
  : "© OpenStreetMap contributors";

export const maptilerStyleUrl = config.maptilerKey
  ? `https://api.maptiler.com/maps/streets-v4/style.json?key=${config.maptilerKey}`
  : undefined;

export const osmStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles,
      tileSize: 256,
      attribution,
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

export const sdkStyle: string | maplibregl.StyleSpecification =
  maptilerStyleUrl ?? osmStyle;
