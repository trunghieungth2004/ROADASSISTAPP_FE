import { api } from "./client";

export type TicketType = "MECHANIC" | "TOW" | "SOS";

export type DispatchTicket = {
  id: string;
  userId: string;
  ticketType: string;
  lat: number;
  lng: number;
  status: string;
  diagnosticId?: string | null;
  alleySegmentId?: string | null;
  accessWidthMeters?: number | null;
  note?: string | null;
  destinationShopId?: string | null;
  destinationSnapshot?: {
    id?: string;
    name?: string;
    lat: number;
    lng: number;
    type?: string;
    label?: string | null;
    source?: string;
  } | null;
  destinationPoint?: {
    lat: number;
    lng: number;
    label?: string;
  } | null;
  vehicleType?: string | null;
  vehicleWidth?: number | null;
  suggestedShopId?: string | null;
  assignedUid?: string | null;
  assignedShopId?: string | null;
  assignedKind?: string | null;
  candidates?: string[];
  riderRating?: number | null;
  helperRating?: number | null;
  distance?: number;
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
    alleySegmentId?: string;
    accessWidthMeters?: number;
    note?: string;
    destinationShopId?: string;
    destinationPoint?: { lat: number; lng: number; label?: string };
    vehicleType?: string;
    vehicleWidth?: number;
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

export function nearTickets(
  payload: {
    lat: number;
    lng: number;
    radiusMeters?: number;
    ticketType?: TicketType;
  },
  token: string,
): Promise<DispatchTicket[]> {
  return api.post<DispatchTicket[]>("/dispatch/near", payload, token);
}

export function ticketOffers(
  payload: {
    lat: number;
    lng: number;
    radiusMeters?: number;
    kind?: "SHOP" | "MOBILE" | "TOW";
    limit?: number;
    accessWidthMeters?: number;
  },
  token: string,
): Promise<
  Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    type: string;
    openNow?: boolean | null;
    accepting?: boolean;
    ratingAvg?: number;
    ratingCount?: number;
    distance?: number;
    fitsAlley?: boolean | null;
  }>
> {
  return api.post("/dispatch/offers", payload, token);
}

export function selectShop(
  ticketId: string,
  shopId: string,
  token: string,
): Promise<{ selected: string }> {
  return api.post<{ selected: string }>(
    "/dispatch/select",
    { ticketId, shopId },
    token,
  );
}

export function acceptTicket(
  ticketId: string,
  token: string,
  shopId?: string,
): Promise<{ matched: boolean; kind: string }> {
  return api.post<{ matched: boolean; kind: string }>(
    "/dispatch/accept",
    shopId ? { ticketId, shopId } : { ticketId },
    token,
  );
}

export function fetchStatuses(
  token: string,
): Promise<Record<string, StatusEntry[]>> {
  return api.post<Record<string, StatusEntry[]>>("/statuses", {}, token);
}
