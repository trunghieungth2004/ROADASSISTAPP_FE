import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { mapDefaults, osmStyle } from "../map/style";

export type MapClick = {
  lng: number;
  lat: number;
};

type MapViewProps = {
  onLoad?: (map: maplibregl.Map) => void;
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
    const map = new maplibregl.Map({
      container: ref.current,
      style: osmStyle,
      center: mapDefaults.center,
      zoom: mapDefaults.zoom,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.on("load", () => loadRef.current?.(map));
    map.on("click", (e) =>
      clickRef.current?.({ lng: e.lngLat.lng, lat: e.lngLat.lat }),
    );
    return () => {
      map.remove();
    };
  }, []);

  return <div ref={ref} className="absolute inset-0" />;
}
