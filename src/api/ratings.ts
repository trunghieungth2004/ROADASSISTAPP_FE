import { api } from "./client";

export type RatingTarget = "VOLUNTEER" | "SHOP" | "RIDER";

export function submitRating(
  payload: {
    targetId: string;
    targetKind: RatingTarget;
    ticketId: string;
    score: number;
  },
  token: string,
): Promise<{ avg: number; count: number; updated: number }> {
  return api.post<{ avg: number; count: number; updated: number }>(
    "/ratings",
    payload,
    token,
  );
}
