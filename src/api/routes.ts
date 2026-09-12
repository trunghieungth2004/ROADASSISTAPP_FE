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

export type RouteOption = {
  distanceMeters: number;
  durationSeconds: number;
  geometry: RouteGeometry;
  source: "osrm" | "cache" | "detour" | "valhalla";
  via?: LatLng;
  hazards?: HazardZone[];
  warnings?: HazardZone[];
};

export type RouteResult = {
  cached: boolean;
  routes: RouteOption[];
};

export function findRoute(
  payload: RouteRequest,
  token: string,
): Promise<RouteResult> {
  return api.post<RouteResult>("/routes", payload, token);
}

export type SavedRouteSummary = {
  id: string;
  userId: string;
  name: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  stops: LatLng[];
  width?: number | null;
  distanceMeters?: number | null;
  durationSeconds?: number | null;
  source?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SavedRoute = SavedRouteSummary & {
  geometry: RouteGeometry;
  via?: LatLng | null;
  hazards?: HazardZone[] | null;
};

export type SaveRoutePayload = {
  name?: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  stops?: LatLng[];
  width?: number;
  distanceMeters?: number;
  durationSeconds?: number;
  source?: string;
  geometry: RouteGeometry;
  via?: LatLng | null;
  hazards?: HazardZone[] | null;
};

export function saveRoute(
  payload: SaveRoutePayload,
  token: string,
): Promise<SavedRoute> {
  return api.post<SavedRoute>("/routes/save", payload, token);
}

export function listSavedRoutes(token: string): Promise<SavedRouteSummary[]> {
  return api.post<SavedRouteSummary[]>("/routes/saved", {}, token);
}

export function getSavedRoute(
  routeId: string,
  token: string,
): Promise<SavedRoute> {
  return api.post<SavedRoute>("/routes/saved/one", {routeId}, token);
}

export function renameSavedRoute(
  routeId: string,
  name: string,
  token: string,
): Promise<{renamed: number}> {
  return api.put<{renamed: number}>("/routes/saved", {routeId, name}, token);
}

export function deleteSavedRoute(
  routeId: string,
  token: string,
): Promise<{deleted: number}> {
  return api.post<{deleted: number}>("/routes/unsave", {routeId}, token);
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
