import { api } from "./client";

export type WarrantyClaim = {
  id: string;
  ticketId: string;
  lineId: string;
  serviceCode: string;
  serviceName: string;
  status: string;
  reason: string;
  warrantyUntil: string;
  createdAt: string;
  linkedTicketId: string | null;
  refundAmount: number | null;
  lineAmount?: number;
  declineReasonCode?: string | null;
  shopResponse?: string | null;
  disputeNote?: string | null;
  resolutionNote?: string | null;
};

export function fileWarrantyClaim(
  payload: { ticketId: string; lineId: string; reason: string; photoUrls?: string[] },
  token: string,
): Promise<WarrantyClaim> {
  return api.post<WarrantyClaim>("/warranty/claims", payload, token);
}

export function myWarrantyClaims(token: string, limit?: number): Promise<WarrantyClaim[]> {
  return api.post<WarrantyClaim[]>("/warranty/mine", typeof limit === "number" ? { limit } : {}, token);
}

export function disputeWarrantyClaim(
  token: string,
  claimId: string,
  note?: string,
): Promise<WarrantyClaim> {
  return api.post<WarrantyClaim>(
    "/warranty/dispute",
    { claimId, ...(note ? { note } : {}) },
    token,
  );
}
