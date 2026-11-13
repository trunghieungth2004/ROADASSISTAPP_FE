import { api } from "./client";

export type TrackingView = {
  ticketId: string;
  ticketType: string;
  status: string;
  lat: number;
  lng: number;
  createdAt: string | null;
  updatedAt: string | null;
  expiresAt: string;
  providerName: string | null;
  etaPickupAt: string | null;
  etaDropoffAt: string | null;
};

export function viewShare(token: string): Promise<TrackingView> {
  return api.post<TrackingView>("/dispatch/share/view", { token });
}
