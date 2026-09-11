import type * as maplibregl from "maplibre-gl";
import { config } from "../config";

export const mapDefaults = {
  center: [106.6602, 10.7626] as [number, number],
  zoom: 13,
};

const tiles = config.maptilerKey
  ? [
      `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${config.maptilerKey}`,
    ]
  : ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"];

const attribution = config.maptilerKey
  ? '© <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'
  : "© OpenStreetMap contributors";

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
