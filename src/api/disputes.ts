import { api } from "./client";

export type FileDisputePayload = {
  ticketId: string;
  reason: string;
  note?: string;
  photoUrl?: string;
  photoUrls?: string[];
};

export function fileDispute(
  payload: FileDisputePayload,
  token: string,
): Promise<{ id: string }> {
  return api.post<{ id: string }>("/disputes", payload, token);
}
