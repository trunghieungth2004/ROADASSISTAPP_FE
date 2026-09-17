import { api } from "./client";

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
  payload: { service: string },
  token: string,
): Promise<{ updated: number; onboarded: boolean; services: string[] }> {
  return api.put<{ updated: number; onboarded: boolean; services: string[] }>(
    "/users/onboard",
    payload,
    token,
  );
}

export function updateProfile(
  payload: { displayName: string },
  token: string,
): Promise<{ updated: number }> {
  return api.put<{ updated: number }>("/users/profile", payload, token);
}

export type AdminUser = {
  id: string;
  email?: string | null;
  displayName?: string | null;
  role: string;
  status?: string | null;
  trustScore?: number | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  onboarded?: boolean;
  services?: string[];
  createdAt?: string;
};

export function fetchAllUsers(token: string): Promise<AdminUser[]> {
  return api.post<AdminUser[]>("/users/all", {}, token);
}

export function updateUserRole(
  targetUserId: string,
  role: string,
  token: string,
): Promise<{ updated: number }> {
  return api.put<{ updated: number }>(
    "/users/role",
    { targetUserId, role },
    token,
  );
}

export function updateUserTrust(
  targetUserId: string,
  trustScore: number,
  token: string,
): Promise<{ updated: number }> {
  return api.put<{ updated: number }>(
    "/users/trust",
    { targetUserId, trustScore },
    token,
  );
}

export function updateUserStatus(
  targetUserId: string,
  status: string,
  token: string,
): Promise<{ updated: number }> {
  return api.put<{ updated: number }>(
    "/users/status",
    { targetUserId, status },
    token,
  );
}
