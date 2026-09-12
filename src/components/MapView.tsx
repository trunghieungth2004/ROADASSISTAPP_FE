import { useEffect, useRef } from "react";
import * as maptilersdk from "@maptiler/sdk";
import { config } from "../config";
import { mapDefaults, osmStyle, sdkStyle } from "../map/style";

export type MapClick = {
  lng: number;
  lat: number;
};

type MapViewProps = {
  onLoad?: (map: maptilersdk.Map) => void;
  onClick?: (point: MapClick) => void;
};

export default function MapView({ onLoad, onClick }: MapViewProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const loadRef = useRef(onLoad);
  const clickRef = useRef(onClick);
  loadRef.current = onLoad;
  clickRef.current = onClick;

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    maptilersdk.config.apiKey = config.maptilerKey;
    let map: maptilersdk.Map | null = null;
    try {
      map = new maptilersdk.Map({
        container: ref.current,
        style: config.maptilerKey ? sdkStyle : osmStyle,
        center: mapDefaults.center,
        zoom: mapDefaults.zoom,
      });
    } catch {
      return;
    }
    const created: maptilersdk.Map = map;
    created.on("load", () => {
      loadRef.current?.(created);
    });
    created.on("error", (e) => {
      console.error("[Map]", e.error?.message ?? e.error);
    });
    created.on("click", (e) =>
      clickRef.current?.({ lng: e.lngLat.lng, lat: e.lngLat.lat }),
    );
    return () => {
      created.remove();
    };
  }, []);

  return <div ref={ref} style={{ position: "absolute", inset: 0 }} />;
}
