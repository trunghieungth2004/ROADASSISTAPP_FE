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

export function fetchMe(token: string): Promise<UserProfile> {
  return api.post<UserProfile>("/users/one", {}, token);
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
