import { api } from "./client";

export type TicketType = "MECHANIC" | "TOW" | "SOS";

export type DispatchTicket = {
  id: string;
  ticketType: string;
  lat: number;
  lng: number;
  status: string;
  diagnosticId?: string | null;
};

export type StatusEntry = {
  domain: string;
  code: string;
  name: string;
};

export function createTicket(
  payload: {
    ticketType: TicketType;
    lat: number;
    lng: number;
    diagnosticId?: string;
  },
  token: string,
): Promise<DispatchTicket> {
  return api.post<DispatchTicket>("/dispatch", payload, token);
}

export function getTicket(
  ticketId: string,
  token: string,
): Promise<DispatchTicket> {
  return api.post<DispatchTicket>("/dispatch/one", { ticketId }, token);
}

export function advanceTicket(
  ticketId: string,
  status: string,
  token: string,
): Promise<{ updated: number }> {
  return api.put<{ updated: number }>(
    "/dispatch/status",
    { ticketId, status },
    token,
  );
}

export function fetchStatuses(
  token: string,
): Promise<Record<string, StatusEntry[]>> {
  return api.post<Record<string, StatusEntry[]>>("/statuses", {}, token);
}
