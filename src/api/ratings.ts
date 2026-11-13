import { api } from "./client";

export type RatingTargetKind = "SHOP" | "RIDER";

export type SubmitRatingPayload = {
  targetId: string;
  targetKind: RatingTargetKind;
  ticketId: string;
  score: number;
  text?: string;
};

export type RatingSummary = {
  avg: number;
  count: number;
  updated: number;
};

export function submitRating(
  payload: SubmitRatingPayload,
  token: string,
): Promise<RatingSummary> {
  return api.post<RatingSummary>("/ratings", payload, token);
}

export function replyRating(
  ratingId: string,
  reply: string,
  token: string,
): Promise<{ replied: boolean }> {
  return api.post<{ replied: boolean }>("/ratings/reply", { ratingId, reply }, token);
}

export type UserRating = {
  id: string;
  score: number;
  text?: string | null;
  reply?: string | null;
  byUserName?: string | null;
  createdAt?: string;
};

export type UserRatings = {
  ratings: UserRating[];
  avg: number;
  count: number;
};

export function userRatings(
  userId: string,
  targetKind: "RIDER",
  ticketId: string | undefined,
  token: string,
): Promise<UserRatings> {
  return api.post<UserRatings>(
    "/users/ratings",
    { userId, targetKind, ticketId },
    token,
  );
}

export function ratingsByTicket(
  ticketId: string,
  token: string,
): Promise<UserRating[]> {
  return api.post<UserRating[]>("/ratings/by-ticket", { ticketId }, token);
}
