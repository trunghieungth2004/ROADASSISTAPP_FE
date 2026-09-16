import { api } from "./client";

export type VolunteerCapability = "SOLO_BIKE" | "CAR";

export type UserProfile = {
  id: string;
  email?: string | null;
  displayName?: string | null;
  role: string;
  status?: string;
  trustScore?: number;
  volunteerAvailable?: boolean;
  volunteerRadiusKm?: number;
  capability?: VolunteerCapability;
  ratingAvg?: number;
  ratingCount?: number;
};

export type MeUser = {
  id: string;
  email?: string | null;
  displayName?: string | null;
  role: string;
  status?: string | null;
  trustScore?: number;
  volunteerAvailable?: boolean;
  volunteerRadiusKm?: number;
  capability?: string;
  ratingAvg?: number;
  ratingCount?: number;
  onboarded?: boolean;
  services?: string[];
};

export type MeVehicle = {
  id: string;
  type: string;
  baseWidth: number;
  baseHeight: number;
};

export type MeBundle = {
  user: MeUser;
  vehicles: MeVehicle[];
  activeVehicle: MeVehicle | null;
};

export function fetchMe(token: string): Promise<UserProfile> {
  return api.post<UserProfile>("/users/one", {}, token);
}

export function fetchMeBundle(token: string): Promise<MeBundle> {
  return api.post<MeBundle>("/users/me", {}, token);
}

export function setActiveVehicle(
  payload: { profileId: string | null },
  token: string,
): Promise<{ updated: number; profileId: string | null }> {
  return api.put<{ updated: number; profileId: string | null }>(
    "/users/activeVehicle",
    payload,
    token,
  );
}

export function setOnboarded(
  payload: { role: string },
  token: string,
): Promise<{ updated: number; onboarded: boolean; services: string[] }> {
  return api.put<{ updated: number; onboarded: boolean; services: string[] }>(
    "/users/onboard",
    payload,
    token,
  );
}

export function setVolunteer(
  payload: {
    available: boolean;
    volunteerRadiusKm?: number;
    capability?: VolunteerCapability;
  },
  token: string,
): Promise<{ updated: number; available: boolean }> {
  return api.put<{ updated: number; available: boolean }>(
    "/users/volunteer",
    payload,
    token,
  );
}

export function volunteerHeartbeat(
  payload: { lat: number; lng: number },
  token: string,
): Promise<{ uid: string }> {
  return api.post<{ uid: string }>(
    "/users/volunteer/heartbeat",
    payload,
    token,
  );
}
