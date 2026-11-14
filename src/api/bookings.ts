import { api } from "./client";

export type BookingStatus =
  | "REQUESTED"
  | "CONFIRMED"
  | "DECLINED"
  | "CANCELLED"
  | "ARRIVED"
  | "COMPLETED"
  | "NO_SHOW";

export type Booking = {
  id: string;
  riderUid: string;
  providerId: string;
  providerName: string;
  serviceCodes: string[];
  serviceSnapshot?: Array<{ code: string; name: string; price: number }>;
  scheduledAt: string;
  slotKey: string;
  status: BookingStatus;
  note: string | null;
  outsideHours: boolean;
  arrivalMode: "SELF" | "TOW";
  origin: {lat: number; lng: number; label?: string | null} | null;
  linkedTicketIds?: string[];
  reminder: {
    mode: string;
    bufferMinutes: number;
    reminderAt: string | null;
    sentAt: string | null;
  } | null;
  depositAmount: number;
  depositStatus: "NONE" | "DUE" | "REQUESTED" | "COLLECTED" | "CONFIRMED" | "APPLIED" | "WAIVED";
  depositCollectedAt: string | null;
  reminderSentAt: string | null;
  arrivedAt: string | null;
  ticketId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BookingSlot = {
  at: string;
  slot: string;
  outsideHours: boolean;
  remaining: number;
};

export type BookingAvailability = {
  providerId: string;
  date: string;
  bookingEnabled: boolean;
  slotMinutes: number;
  capacity: number;
  freeForm: boolean;
  alwaysOpen: boolean;
  depositPolicy: "NONE" | "FIXED" | "PERCENT";
  depositAmount: number;
  depositPercent: number;
  slots: BookingSlot[];
};

export function fetchBookingAvailability(
  providerId: string,
  token: string,
  date?: string,
): Promise<BookingAvailability> {
  return api.post<BookingAvailability>(
    "/bookings/availability",
    { providerId, ...(date ? { date } : {}) },
    token,
  );
}

export function createBooking(
  input: {
    providerId: string;
    scheduledAt: string;
    serviceCodes?: string[];
    note?: string;
    vehicleId?: string;
    arrivalMode?: "SELF" | "TOW";
    origin?: {lat: number; lng: number; label?: string | null};
    bufferMinutes?: number;
  },
  token: string,
): Promise<Booking> {
  return api.post<Booking>("/bookings", input, token);
}

export function respondBooking(
  bookingId: string,
  accept: boolean,
  token: string,
  reason?: string,
): Promise<Booking> {
  return api.post<Booking>(
    "/bookings/respond",
    { bookingId, accept, ...(reason ? { reason } : {}) },
    token,
  );
}

export function cancelBooking(
  bookingId: string,
  token: string,
  reason?: string,
): Promise<Booking> {
  return api.post<Booking>(
    "/bookings/cancel",
    { bookingId, ...(reason ? { reason } : {}) },
    token,
  );
}

export function arriveBooking(
  bookingId: string,
  token: string,
): Promise<{ booking: Booking; ticketId: string }> {
  return api.post<{ booking: Booking; ticketId: string }>(
    "/bookings/arrive",
    { bookingId },
    token,
  );
}

export function completeBooking(
  bookingId: string,
  token: string,
): Promise<Booking> {
  return api.post<Booking>("/bookings/complete", { bookingId }, token);
}

export function collectBookingDeposit(
  bookingId: string,
  collected: boolean,
  token: string,
): Promise<Booking> {
  return api.post<Booking>(
    "/bookings/deposit",
    { bookingId, collected },
    token,
  );
}

export function requestBookingDeposit(
  bookingId: string,
  token: string,
): Promise<{ booking: Booking }> {
  return api.post<{ booking: Booking }>(
    "/bookings/deposit/request",
    { bookingId },
    token,
  );
}

export function myBookings(token: string): Promise<{ bookings: Booking[] }> {
  return api.post<{ bookings: Booking[] }>("/bookings/mine", {}, token);
}

export function shopBookings(
  providerId: string,
  token: string,
): Promise<{ bookings: Booking[] }> {
  return api.post<{ bookings: Booking[] }>(
    "/bookings/shop",
    { providerId },
    token,
  );
}

export type SepayCheckout = {
  action: string;
  method: string;
  fields: Record<string, string>;
  qrUrl: string;
};

export type DepositCheckout = {
  id: string;
  status: string;
  checkout?: SepayCheckout | null;
};

export function depositCheckout(
  bookingId: string,
  token: string,
): Promise<DepositCheckout> {
  return api.post<DepositCheckout>(
    "/bookings/deposit/checkout",
    { bookingId },
    token,
  );
}
