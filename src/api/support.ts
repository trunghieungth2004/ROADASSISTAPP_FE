import { api } from "./client";

export type SupportTicket = {
  id: string;
  userId: string;
  ticketId: string | null;
  category: string;
  message: string;
  status: "OPEN" | "ANSWERED" | "CLOSED";
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
};

export function adminSupport(
  token: string,
  status?: string,
): Promise<{ tickets: SupportTicket[] }> {
  return api.post<{ tickets: SupportTicket[] }>(
    "/admin/support",
    status ? { status } : {},
    token,
  );
}

export function adminSupportRespond(
  token: string,
  supportId: string,
  answer: string,
  close?: boolean,
): Promise<SupportTicket> {
  return api.post<SupportTicket>(
    "/admin/support/respond",
    { supportId, answer, ...(close ? { close } : {}) },
    token,
  );
}

export function createSupportTicket(
  payload: { category: string; message: string; ticketId?: string },
  token: string,
): Promise<SupportTicket> {
  return api.post<SupportTicket>("/support", payload, token);
}

export function mySupportTickets(
  token: string,
): Promise<{ tickets: SupportTicket[] }> {
  return api.post<{ tickets: SupportTicket[] }>("/support/mine", {}, token);
}
