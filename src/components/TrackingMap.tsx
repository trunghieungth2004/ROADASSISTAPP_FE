import { useEffect, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import MapView from "./MapView";

function pin(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = "22px";
  el.style.height = "22px";
  el.style.borderRadius = "9999px";
  el.style.background = "#0284c7";
  el.style.border = "3px solid #ffffff";
  el.style.boxShadow = "0 0 0 6px rgba(2,132,199,.25), 0 1px 6px rgba(0,0,0,.4)";
  return el;
}

export default function TrackingMap({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}) {
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const markerRef = useRef<maptilersdk.Marker | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markerRef.current?.remove();
    markerRef.current = new maptilersdk.Marker({ element: pin() })
      .setLngLat([lng, lat])
      .addTo(map);
    map.easeTo({ center: [lng, lat], duration: 500 });
  }, [lat, lng, ready]);

  useEffect(() => {
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, []);

  return (
    <MapView
      onLoad={(map) => {
        mapRef.current = map;
        map.jumpTo({ center: [lng, lat], zoom: 15 });
        setReady(true);
      }}
    />
  );
}
