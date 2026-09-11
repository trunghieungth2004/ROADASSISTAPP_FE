import { api } from "./client";

export type LatLng = {
  lat: number;
  lng: number;
};

export type RouteRequest = {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  stops?: LatLng[];
  width?: number;
};

export type RouteGeometry = {
  type: "LineString";
  coordinates: [number, number][];
};

export type HazardZone = {
  flagId: string;
  type?: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  note?: string | null;
  distanceMeters: number;
};

export type WidthBlock = {
  segmentId: string;
  baseWidth: number;
  distanceMeters: number;
};

export type RouteSuccess = {
  cached: boolean;
  distanceMeters: number;
  durationSeconds: number;
  geometry: RouteGeometry;
  source: "osrm" | "cache" | "detour";
  via?: LatLng;
  hazards?: HazardZone[];
};

export function findRoute(
  payload: RouteRequest,
  token: string,
): Promise<RouteSuccess> {
  return api.post<RouteSuccess>("/routes", payload, token);
}

export function isHazardZone(e: unknown): e is HazardZone {
  return (
    !!e && typeof e === "object" && "flagId" in e && "radiusMeters" in e
  );
}

export function isWidthBlock(e: unknown): e is WidthBlock {
  return (
    !!e && typeof e === "object" && "segmentId" in e && "baseWidth" in e
  );
}
