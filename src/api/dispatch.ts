import { api } from "./client";

export type ShopWorkItem = {
  name: string;
  qty: number;
  unitPrice: number;
  amount?: number;
  serviceCode?: string | null;
  note?: string | null;
};

export type ShopTicket = {
  id: string;
  userId: string;
  riderName?: string | null;
  ticketType: string;
  status: string;
  lat: number;
  lng: number;
  symptom?: string | null;
  note?: string | null;
  description?: string | null;
  vehicleLabel?: string | null;
  vehiclePlate?: string | null;
  vehicleType?: string | null;
  providerId?: string | null;
  assignedShopId?: string | null;
  createdAt?: string | null;
  shopQuotedAmount?: number | null;
  finalAmount?: number | null;
  invoiceAmount?: number | null;
  invoiceApproval?: string | null;
  workType?: string | null;
  invoiceRef?: string | null;
  quoteItems?: ShopWorkItem[] | null;
  invoiceItems?: ShopWorkItem[] | null;
  declineReason?: string | null;
  declineNote?: string | null;
};

export type DeclineReason = "FULL" | "CLOSED" | "PARTS_DELAY" | "OTHER";

export type QuoteInput = {
  quotedAmount: number;
  workType?: string;
  items?: ShopWorkItem[];
};

export type WorkOrderInput = {
  ticketId: string;
  workType?: string;
  invoiceRef?: string;
  warrantyDays?: number;
  items?: ShopWorkItem[];
};

export function shopRequests(
  shopId: string,
  token: string,
): Promise<ShopTicket[]> {
  return api.post<ShopTicket[]>("/dispatch/shop/requests", { shopId }, token);
}

export function shopRecords(
  shopId: string,
  limit: number,
  token: string,
): Promise<ShopTicket[]> {
  return api.post<ShopTicket[]>(
    "/dispatch/shop/records",
    { shopId, limit },
    token,
  );
}

export function acceptTicket(
  ticketId: string,
  shopId: string,
  token: string,
): Promise<{ matched: boolean; kind: string }> {
  return api.post<{ matched: boolean; kind: string }>(
    "/dispatch/accept",
    { ticketId, shopId },
    token,
  );
}

export function declineTicket(
  ticketId: string,
  shopId: string,
  reason: DeclineReason,
  note: string | undefined,
  token: string,
): Promise<{ declined: boolean }> {
  return api.post<{ declined: boolean }>(
    "/dispatch/decline",
    { ticketId, shopId, reason, ...(note ? { note } : {}) },
    token,
  );
}

export function sendQuote(
  ticketId: string,
  input: QuoteInput,
  token: string,
): Promise<{ quoted: boolean; version?: number }> {
  return api.post<{ quoted: boolean; version?: number }>(
    "/dispatch/quote",
    {
      ticketId,
      quotedAmount: input.quotedAmount,
      ...(input.workType ? { workType: input.workType } : {}),
      ...(input.items && input.items.length > 0 ? { items: input.items } : {}),
    },
    token,
  );
}

export function updateWorkOrder(
  input: WorkOrderInput,
  token: string,
): Promise<{ updated: number }> {
  return api.post<{ updated: number }>(
    "/dispatch/work",
    {
      ticketId: input.ticketId,
      ...(input.workType ? { workType: input.workType } : {}),
      ...(input.invoiceRef ? { invoiceRef: input.invoiceRef } : {}),
      ...(typeof input.warrantyDays === "number" ? { warrantyDays: input.warrantyDays } : {}),
      ...(input.items && input.items.length > 0 ? { items: input.items } : {}),
    },
    token,
  );
}

export function updateTicketStatus(
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

export type RiderTicket = {
  id: string;
  userId: string;
  ticketType: string;
  status: string;
  lat: number;
  lng: number;
  symptom?: string | null;
  note?: string | null;
  description?: string | null;
  vehicleId?: string | null;
  vehicleType?: string | null;
  vehicleWidth?: number | null;
  vehicleLabel?: string | null;
  vehiclePlate?: string | null;
  providerId?: string | null;
  assignedShopId?: string | null;
  destinationShopId?: string | null;
  providerSnapshot?: { name?: string | null } | null;
  destinationSnapshot?: {
    name?: string | null;
    label?: string | null;
    lat?: number;
    lng?: number;
  } | null;
  shopQuotedAmount?: number | null;
  finalAmount?: number | null;
  mobileCallOutFee?: number | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  createdAt?: string | null;
};

export type CreateTicketInput = {
  ticketType: "SOS" | "TOW" | "WALK_IN" | "MECHANIC";
  lat: number;
  lng: number;
  symptom?: string;
  note?: string;
  description?: string;
  vehicleId?: string;
  vehicleType?: string;
  vehicleWidth?: number;
  providerId?: string;
  destinationShopId?: string;
};

export function createTicket(
  input: CreateTicketInput,
  token: string,
): Promise<RiderTicket> {
  return api.post<RiderTicket>("/dispatch", input, token);
}

export function myTickets(token: string): Promise<RiderTicket[]> {
  return api.post<RiderTicket[]>("/dispatch/mine", {}, token);
}

export function getTicket(
  ticketId: string,
  token: string,
): Promise<RiderTicket> {
  return api.post<RiderTicket>("/dispatch/one", { ticketId }, token);
}

export function cancelTicket(
  ticketId: string,
  token: string,
  reasonCode?: string,
): Promise<{ updated: number }> {
  return api.put<{ updated: number }>(
    "/dispatch/status",
    { ticketId, status: "5", ...(reasonCode ? { reasonCode } : {}) },
    token,
  );
}

export function approveQuote(
  ticketId: string,
  token: string,
): Promise<{ approved: boolean }> {
  return api.post<{ approved: boolean }>(
    "/dispatch/quote/approve",
    { ticketId },
    token,
  );
}

export function declineQuote(
  ticketId: string,
  token: string,
  reason?: string,
): Promise<{ declined: boolean; status: string }> {
  return api.post<{ declined: boolean; status: string }>(
    "/dispatch/quote/decline",
    { ticketId, ...(reason ? { reason } : {}) },
    token,
  );
}

export function approveMobileFix(
  ticketId: string,
  token: string,
): Promise<{ approved: boolean }> {
  return api.post<{ approved: boolean }>(
    "/dispatch/mobile-shop/fix/approve",
    { ticketId },
    token,
  );
}

export function declineMobileFix(
  ticketId: string,
  token: string,
  reason?: string,
): Promise<{ declined: boolean }> {
  return api.post<{ declined: boolean }>(
    "/dispatch/mobile-shop/fix/decline",
    { ticketId, ...(reason ? { reason } : {}) },
    token,
  );
}
