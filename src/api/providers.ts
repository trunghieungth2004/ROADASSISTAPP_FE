import { api } from "./client";

export type ProviderKind = "SHOP" | "TOW" | "MOBILE_SHOP";

export type Provider = {
  id: string;
  kind: ProviderKind;
  operatorUid?: string | null;
  name: string;
  lat: number;
  lng: number;
  label?: string | null;
  openHours?: string | null;
  vehicleClasses?: string[] | null;
  accepting?: boolean;
  plate?: string | null;
  vehicleType?: string | null;
  vehicleLabel?: string | null;
  vehicleWidth?: number | null;
  vehicleHeight?: number | null;
  serviceFee?: number | null;
  serviceUsage?: Record<string, number> | null;
  taxCode?: string | null;
  bookingEnabled?: boolean;
  bookingSlotMinutes?: number | null;
  bookingCapacity?: number | null;
  bookingLeadMinutes?: number | null;
  bookingHorizonDays?: number | null;
  bookingHours?: string | null;
  bookingAlwaysOpen?: boolean;
  depositPolicy?: "NONE" | "FIXED" | "PERCENT" | null;
  depositAmount?: number | null;
  depositPercent?: number | null;
  services?: Array<{
    code: string;
    name: string;
    displayPrice: number;
    quoteRequired: boolean;
    category?: string;
    warrantyDays?: number;
    warrantyParts?: "LABOR_ONLY" | "PARTS_AND_LABOR";
    channels?: Array<"BOOKING" | "ASSIST">;
  }> | null;
  callOutFee?: number | null;
  travelPerKmFee?: number | null;
  licenseNumber?: string | null;
  towBaseFee?: number | null;
  towPerKmFee?: number | null;
  waitingRatePer15Min?: number | null;
  status: string;
  suspended?: boolean;
  suspendedReason?: string | null;
  reviewNote?: string | null;
  applicantEmail?: string | null;
  applicantName?: string | null;
  applicantPhone?: string | null;
  openReportCount?: number;
  requestedAt?: string;
  decidedAt?: string | null;
  reviewedBy?: string | null;
  createdAt?: string;
  distanceMeters?: number;
  distance?: number;
  openNow?: boolean | null;
  ratingAvg?: number;
  ratingCount?: number;
};

export type ProviderReport = {
  id: string;
  providerId: string;
  providerKind: string;
  reportedBy: string;
  ticketId?: string | null;
  reason: string;
  note?: string | null;
  status: string;
  providerName?: string | null;
  providerStatus?: string | null;
  providerSuspended?: boolean;
  createdAt?: string;
};

export type ProviderRating = {
  id: string;
  score: number;
  text?: string | null;
  byUserName?: string | null;
  reply?: string | null;
  repliedAt?: string | null;
  createdAt?: string;
};

export type ProviderRatings = {
  ratings: ProviderRating[];
  avg: number;
  count: number;
  completedJobs: number;
};

export function fetchMyProviders(token: string): Promise<Provider[]> {
  return api.post<Provider[]>("/providers/mine", {}, token);
}

export type ProviderStats = {
  providers: Array<{
    id: string;
    kind: ProviderKind;
    name: string;
    status: string;
    accepting: boolean;
    suspended: boolean;
    ratingAvg: number;
    ratingCount: number;
    completedJobs: number;
  }>;
  payouts: {
    batches: number;
    gross: number;
    net: number;
    commissionOwed: number;
  };
};

export function providerStats(token: string): Promise<ProviderStats> {
  return api.post<ProviderStats>("/providers/stats", {}, token);
}

export type ProviderPricingLimits = {
  TOW: {
    baseMin: number;
    baseMax: number;
    perKmMin: number;
    perKmMax: number;
  };
  MOBILE_SHOP: {
    callOutMin: number;
    callOutMax: number;
    travelPerKmMin: number;
    travelPerKmMax: number;
  };
};

export function fetchProviderPricingLimits(token: string): Promise<ProviderPricingLimits> {
  return api.post<ProviderPricingLimits>("/providers/pricing", {}, token);
}

export function nearProviders(
  lat: number,
  lng: number,
  token: string,
  options?: {
    kind?: ProviderKind;
    radiusMeters?: number;
    limit?: number;
    acceptingOnly?: boolean;
    openOnly?: boolean;
    vehicleClass?: "SOLO_BIKE" | "CAR";
  },
): Promise<Provider[]> {
  return api.post<Provider[]>("/providers/near", { lat, lng, ...options }, token);
}

export function searchProviders(
  lat: number,
  lng: number,
  query: string,
  token: string,
  options?: {
    kind?: ProviderKind;
    limit?: number;
    acceptingOnly?: boolean;
    openOnly?: boolean;
    vehicleClass?: "SOLO_BIKE" | "CAR";
  },
): Promise<Provider[]> {
  return api.post<Provider[]>("/providers/search", { lat, lng, query, ...options }, token);
}

export function providerRatings(
  providerId: string,
  token: string,
): Promise<ProviderRatings> {
  return api.post<ProviderRatings>("/providers/ratings", { providerId }, token);
}

export function createShopProvider(
  payload: {
    name: string;
    lat: number;
    lng: number;
    label?: string;
    openHours?: string;
    serviceFee?: number;
  },
  token: string,
): Promise<Provider> {
  return api.post<Provider>("/providers", { kind: "SHOP", ...payload }, token);
}

export function createTowProvider(
  payload: {
    name: string;
    lat: number;
    lng: number;
    label?: string;
    plate: string;
    vehicleType: string;
    vehicleLabel?: string;
    vehicleWidth?: number;
    vehicleHeight?: number;
    towBaseFee?: number;
    towPerKmFee?: number;
    waitingRatePer15Min?: number;
  },
  token: string,
): Promise<Provider> {
  return api.post<Provider>("/providers", { kind: "TOW", ...payload }, token);
}

export function createMobileShopProvider(
  payload: {
    name: string;
    lat: number;
    lng: number;
    label?: string;
    plate: string;
    vehicleType: string;
    vehicleLabel?: string;
    vehicleWidth?: number;
    vehicleHeight?: number;
    licenseNumber: string;
    callOutFee?: number;
    travelPerKmFee?: number;
  },
  token: string,
): Promise<Provider> {
  return api.post<Provider>("/providers", { kind: "MOBILE_SHOP", ...payload }, token);
}

export function updateProvider(
  payload: {
    providerId: string;
    name?: string;
    label?: string | null;
    lat?: number;
    lng?: number;
    openHours?: string | null;
    accepting?: boolean;
    callOutFee?: number;
    travelPerKmFee?: number;
    towBaseFee?: number;
    towPerKmFee?: number;
    waitingRatePer15Min?: number;
    taxCode?: string | null;
    bookingEnabled?: boolean;
    bookingSlotMinutes?: number;
    bookingCapacity?: number;
    bookingLeadMinutes?: number;
    bookingHorizonDays?: number;
    bookingHours?: string | null;
    bookingAlwaysOpen?: boolean;
    depositPolicy?: "NONE" | "FIXED" | "PERCENT";
    depositAmount?: number;
    depositPercent?: number;
  },
  token: string,
): Promise<{ updated: number }> {
  return api.put<{ updated: number }>("/providers", payload, token);
}

export function revokeProvider(
  providerId: string,
  token: string,
): Promise<{ revoked: boolean }> {
  return api.post<{ revoked: boolean }>("/providers/revoke", { providerId }, token);
}

export function reportProvider(
  payload: { providerId: string; reason: string; note?: string },
  token: string,
): Promise<{ id: string }> {
  return api.post<{ id: string }>("/providers/report", payload, token);
}

export function fetchOpenReports(token: string): Promise<ProviderReport[]> {
  return api.post<ProviderReport[]>("/providers/reports", {}, token);
}

export function dismissReport(reportId: string, token: string): Promise<{ dismissed: boolean }> {
  return api.post<{ dismissed: boolean }>("/providers/reports/dismiss", { reportId }, token);
}

export function suspendProvider(
  payload: { providerId: string; reason?: string; reportId?: string },
  token: string,
): Promise<{ suspended: boolean; reportDecided: boolean | null }> {
  return api.post<{ suspended: boolean; reportDecided: boolean | null }>(
    "/providers/suspend",
    payload,
    token,
  );
}

export function restoreProvider(
  providerId: string,
  token: string,
): Promise<{ restored: boolean }> {
  return api.post<{ restored: boolean }>("/providers/restore", { providerId }, token);
}

export function fetchPendingProviders(token: string): Promise<Provider[]> {
  return api.post<Provider[]>("/providers/pending", {}, token);
}

export type AdminProviderListFilters = {
  status?: string;
  kind?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
};

export type AdminProviderList = {
  total: number;
  counts: Record<string, number>;
  kindCounts: Record<string, number>;
  items: Provider[];
};

export function fetchAdminProviders(
  token: string,
  filters: AdminProviderListFilters = {},
): Promise<AdminProviderList> {
  return api.post<AdminProviderList>("/providers/admin/list", filters, token);
}

export function reviewProvider(
  payload: { providerId: string; approve: boolean; reviewNote?: string },
  token: string,
): Promise<{ decided: boolean; status: string }> {
  return api.post<{ decided: boolean; status: string }>(
    "/providers/review",
    payload,
    token,
  );
}
