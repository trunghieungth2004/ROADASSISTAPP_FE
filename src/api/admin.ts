import { api } from "./client";
import { config } from "../config";

export type AdminDashboard = {
  windowDays: number;
  from: string;
  users: { total: number; active: number; admins: number };
  providers: {
    total: number;
    suspended: number;
    byKind: Record<string, Record<string, number>>;
    ratingAvg: number;
    ratingCount: number;
  };
  tickets: {
    total: number;
    active: number;
    matched: number;
    matchRate: number;
    avgAcceptMinutes: number | null;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
  money: {
    gross: number;
    commission: number;
    refunded: number;
    net: number;
    payoutsNet: number;
    payoutsCommissionDeducted: number;
    payoutsCount: number;
    commissionOwed: number;
    payeesOwingCommission: number;
    byMethod: Record<string, number>;
    byStatus: Record<string, number>;
  };
  flags: { total: number; recent7d: number; byStatus: Record<string, number> };
  series?: {
    daily: Array<{
      date: string;
      gross: number;
      commission: number;
      net: number;
      refunds: number;
      payments: number;
      tickets: number;
      users: number;
      providers: number;
      cases: number;
    }>;
    sla: Array<{ date: string; matchRate: number; avgAcceptMinutes: number }>;
    cases: Array<{
      date: string;
      reports: number;
      disputes: number;
      appeals: number;
      ratingReviews: number;
    }>;
    paymentsByStatus: Record<string, number>;
    paymentsByMethod: Record<string, number>;
    ticketsByStatus: Record<string, number>;
    ticketsByType: Record<string, number>;
    casesByKind: Record<string, number>;
    casesByStatus: Record<string, number>;
    flagsByStatus: Record<string, number>;
    flagsByType: Record<string, number>;
    topProviders: Array<{
      id: string;
      name: string;
      kind: string;
      gross: number;
      net: number;
      jobs: number;
      ratingAvg: number;
      ratingCount: number;
    }>;
  };
};

export type AdminPayeeGroup = {
  payeeId: string;
  payeeName: string | null;
  gross: number;
  commission: number;
  refunded: number;
  net: number;
  itemCount: number;
  paymentIds: string[];
  ticketIds: string[];
  commissionOwed: number;
  available: number;
};

export type AdminPayoutRequest = {
  id: string;
  payeeId: string;
  payeeName: string | null;
  amount: number;
  status: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  holderName: string;
  note: string | null;
  requestedAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
};

export type AdminDisputeTicket = {
  id: string;
  ticketType: string;
  status: string;
  symptom: string | null;
  description: string | null;
  waitingFee: number | null;
  paymentStatus: string | null;
  photoUrls: string[];
  quoteAmount: number | null;
  finalAmount: number | null;
  assignedShopId: string | null;
  createdAt: string | null;
  statusHistory: AdminTicketTimelineEntry[];
  destinationDecline: {
    shopId: string | null;
    reasonCode: string;
    by: string | null;
    at: string | null;
  } | null;
};

export type AdminTicketTimelineEntry = {
  status: string;
  at: string;
  by: string | null;
};

export type AdminDisputeParty = {
  id: string;
  name: string | null;
  email: string | null;
  ratingAvg: number;
  ratingCount: number;
  trustScore: number;
};

export type AdminDisputeProvider = {
  id: string;
  name: string;
  kind: string;
  status: string;
  suspended: boolean;
  ratingAvg: number;
  ratingCount: number;
  declineCount: number;
  operatorUid: string | null;
};

export type AdminDisputePayment = {
  id: string;
  amount: number;
  method: string;
  status: string;
  refundAmount: number | null;
  disputeHold: boolean;
  disputedAt: string | null;
};

export type AdminDisputeHistoryRow = {
  id: string;
  status: string;
  type: string;
  reasonCode: string;
  outcome: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type AdminDisputeContext = {
  ticket: AdminDisputeTicket | null;
  rider: AdminDisputeParty | null;
  provider: AdminDisputeProvider | null;
  payments: AdminDisputePayment[];
  history: AdminDisputeHistoryRow[];
  filer: "RIDER" | "PROVIDER" | "ADMIN" | "SYSTEM" | null;
};

export type AdminDispute = {
  id: string;
  ticketId: string;
  filedBy: string;
  accusedKind: string;
  accusedId?: string | null;
  type: string;
  reasonCode: string;
  note?: string | null;
  photoUrls?: string[];
  status: string;
  resolution?: string | null;
  outcome?: string | null;
  adjustedAmount?: number | null;
  hold?: boolean;
  createdAt: string;
  context?: AdminDisputeContext;
};

export function adminDashboard(token: string, days?: number): Promise<AdminDashboard> {
  return api.post<AdminDashboard>("/admin/dashboard", typeof days === "number" ? { days } : {}, token);
}

export function adminPendingPayouts(token: string): Promise<AdminPayeeGroup[]> {
  return api.post<AdminPayeeGroup[]>("/admin/payouts/pending", {}, token);
}

export function adminSettlePayout(token: string, payeeId: string, note?: string): Promise<{ batch: { id: string; payoutRef: string }; settled: number; commissionDeducted: number }> {
  return api.post("/admin/payouts/batch", { payeeId, ...(note ? { note } : {}) }, token);
}

export function adminSettleCommission(token: string, payeeId: string): Promise<{ settled: number }> {
  return api.post<{ settled: number }>("/admin/payouts/commission", { payeeId }, token);
}

export function adminPayoutRequests(token: string, status?: string): Promise<AdminPayoutRequest[]> {
  return api.post<AdminPayoutRequest[]>("/admin/payouts/requests", status ? { status } : {}, token);
}

export function adminDecidePayoutRequest(token: string, requestId: string, approve: boolean, note?: string): Promise<{ request: AdminPayoutRequest; batch: { id: string; payoutRef: string } | null; commissionDeducted: number }> {
  return api.post("/admin/payouts/requests/decide", { requestId, approve, ...(note ? { note } : {}) }, token);
}

export function adminDisputes(token: string, status?: string): Promise<AdminDispute[]> {
  return api.post<AdminDispute[]>("/disputes/all", status ? { status } : {}, token);
}

export function adminResolveDispute(token: string, payload: { disputeId: string; resolution: string; outcome?: string; adjustedAmount?: number }): Promise<{ resolved: boolean }> {
  return api.post<{ resolved: boolean }>("/disputes/resolve", payload, token);
}

export async function downloadReport(
  kind: "revenue" | "payees",
  params: { from?: string; to?: string },
  token: string,
): Promise<Blob> {
  const res = await fetch(`${config.apiBaseUrl}/admin/reports/${kind}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...params, format: "csv" }),
  });
  if (!res.ok) throw new Error(`Report failed (HTTP ${res.status})`);
  return res.blob();
}

export type AdminRefund = {
  id: string;
  paymentId: string;
  ticketId: string;
  riderUid: string;
  payeeId: string;
  amount: number;
  originalAmount: number;
  status: string;
  reason: string | null;
  automatic: boolean;
  requestedAt: string;
  bankCode: string | null;
  bankName: string | null;
  accountNumber: string | null;
  holderName: string | null;
  transferRef: string | null;
  decisionNote: string | null;
  riderName: string | null;
  payeeName: string | null;
  ticketStatus: string | null;
};

export function adminRefunds(token: string, status?: string): Promise<AdminRefund[]> {
  return api.post<AdminRefund[]>("/admin/refunds", status ? { status } : {}, token);
}

export function adminRefundDecide(token: string, refundId: string, approve: boolean, note?: string): Promise<AdminRefund> {
  return api.post<AdminRefund>("/admin/refunds/decide", { refundId, approve, ...(note ? { note } : {}) }, token);
}

export function adminRefundSend(token: string, refundId: string, transferRef?: string): Promise<AdminRefund> {
  return api.post<AdminRefund>("/admin/refunds/send", { refundId, ...(transferRef ? { transferRef } : {}) }, token);
}

export function adminRefundConfirm(token: string, refundId: string, transferRef?: string): Promise<{ request: AdminRefund }> {
  return api.post<{ request: AdminRefund }>("/admin/refunds/confirm", { refundId, ...(transferRef ? { transferRef } : {}) }, token);
}

export function adminRefundFail(token: string, refundId: string, reason?: string): Promise<AdminRefund> {
  return api.post<AdminRefund>("/admin/refunds/fail", { refundId, ...(reason ? { reason } : {}) }, token);
}

export type AdminProviderStats = {
  provider: {
    id: string;
    kind: string;
    name: string;
    status: string;
    suspended: boolean;
    accepting: boolean;
    ratingAvg: number;
    ratingCount: number;
    services: Array<{code: string; name: string; displayPrice: number; quoteRequired: boolean}>;
  };
  completedJobs: number;
  recentResolved: number;
  payouts: {batches: number; gross: number; net: number; commissionOwed: number};
};

export type AdminOps = {
  generatedAt: string;
  payments: {stuckPending: number; stuckAmount: number};
  refunds: {requested: number; approved: number; sent: number; failed: number; openAmount: number};
  quotes: {expiredNotSwept: number};
  walkIns: {pending: number};
  commission: {owedTotal: number};
};

export function adminProviderStats(token: string, providerId: string): Promise<AdminProviderStats> {
  return api.post<AdminProviderStats>("/admin/providers/stats", { providerId }, token);
}

export function adminOps(token: string): Promise<AdminOps> {
  return api.post<AdminOps>("/admin/ops", {}, token);
}

export function adminRegisterPush(
  token: string,
  deviceToken: string,
): Promise<{ userId: string; tokens: string[]; updatedAt: string }> {
  return api.post("/admin/push/register", { token: deviceToken }, token);
}

export function adminUnregisterPush(
  token: string,
  deviceToken: string,
): Promise<{ removed: boolean }> {
  return api.post("/admin/push/unregister", { token: deviceToken }, token);
}

export type AdminWarrantyClaim = {
  id: string;
  ticketId: string;
  lineId: string;
  serviceName: string;
  category?: string | null;
  providerId: string;
  providerName?: string | null;
  vehicleLabel?: string | null;
  vehiclePlate?: string | null;
  lineAmount: number;
  status: string;
  reason: string;
  shopResponse?: string | null;
  declineReasonCode?: string | null;
  disputeNote?: string | null;
  resolutionNote?: string | null;
  refundAmount?: number | null;
  photoUrls?: string[];
  warrantyUntil: string;
  createdAt: string;
  outcome?: string | null;
  resolvedAt?: string | null;
};

export function adminWarrantyClaims(
  token: string,
  status?: string,
): Promise<AdminWarrantyClaim[]> {
  return api.post<AdminWarrantyClaim[]>(
    "/admin/warranty/claims",
    status ? { status } : {},
    token,
  );
}

export function adminResolveWarranty(
  token: string,
  payload: {
    claimId: string;
    outcome: "SHOP" | "RIDER" | "PARTIAL";
    refundAmount?: number;
    note: string;
  },
): Promise<AdminWarrantyClaim> {
  return api.post<AdminWarrantyClaim>(
    "/admin/warranty/resolve",
    payload,
    token,
  );
}

export type AdminConfig = {
  commissionRate: Record<string, number>;
  towBaseFee: number;
  towPerKmFee: number;
  carBaseFee: number;
  carMultiplier: number;
  nightMultiplier: number;
  minimumTowFee: number;
  bikeIncludedKm: number;
  carIncludedKm: number;
  ceilingMultiplier: number;
  waitingRatePer15Min: number;
  waitingGraceMin: number;
  waitingCapMin: number;
  detourTolerancePct: number;
  deadheadPayable: boolean;
  refundPolicy: string;
  features: Record<string, boolean>;
  nightWindow?: { start: number; end: number };
  paymentMethodsEnabled?: string[];
  providerPricing?: {
    TOW?: { baseMin: number; baseMax: number; perKmMin: number; perKmMax: number };
    MOBILE_SHOP?: {
      callOutMin: number;
      callOutMax: number;
      travelPerKmMin: number;
      travelPerKmMax: number;
    };
  };
  updatedAt?: string | null;
  updatedBy?: string | null;
  [key: string]: unknown;
};

export function adminConfig(token: string): Promise<AdminConfig> {
  return api.post<AdminConfig>("/admin/config", {}, token);
}

export function adminUpdateConfig(
  token: string,
  patch: Record<string, unknown>,
): Promise<AdminConfig> {
  return api.put<AdminConfig>("/admin/config", patch, token);
}

export type AdminAuditRow = {
  id: string;
  adminUid: string;
  actorName?: string | null;
  actorEmail?: string | null;
  action: string;
  category?: string | null;
  targetType: string;
  targetId: string | null;
  targetLabel?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  note?: string | null;
  requestId?: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

export function adminAudit(
  token: string,
  params?: number | { limit?: number; before?: string; from?: string; to?: string },
): Promise<AdminAuditRow[]> {
  const body = typeof params === "number" ? { limit: params } : params ?? {};
  return api.post<AdminAuditRow[]>("/admin/audit", body, token);
}

export type AdminPaymentAudit = {
  scanned: number;
  tickets: number;
  missingTickets: number;
  drift: Array<{
    ticketId: string;
    paymentId: string;
    expected: string;
    actual: string | null;
  }>;
};

export function adminPaymentsAudit(
  token: string,
  limit?: number,
): Promise<AdminPaymentAudit> {
  return api.post<AdminPaymentAudit>(
    "/admin/payments/audit",
    typeof limit === "number" ? { limit } : {},
    token,
  );
}

export type AdminPayoutBatch = {
  id: string;
  payeeId: string;
  payeeName: string | null;
  gross: number;
  commission: number;
  refunded: number;
  net: number;
  commissionDeducted: number;
  netPayout: number;
  itemCount: number;
  status: string;
  payoutRef: string;
  payoutMethod: string;
  note?: string | null;
  batchedAt: string;
  createdAt: string;
};

export function adminPayoutBatches(
  token: string,
  limit?: number,
): Promise<AdminPayoutBatch[]> {
  return api.post<AdminPayoutBatch[]>(
    "/admin/payouts/batches",
    typeof limit === "number" ? { limit } : {},
    token,
  );
}

export type AdminSearchResults = {
  users: Array<{id: string; name: string | null; email: string | null; phone: string | null; role: string | null; status: string | null}>;
  providers: Array<{id: string; name: string; kind: string; status: string; plate: string | null}>;
  tickets: Array<{id: string; ticketType: string; status: string; riderId: string; createdAt: string | null}>;
  payments: Array<{id: string; ticketId: string; amount: number; method: string; status: string; createdAt: string}>;
};

export function adminSearch(token: string, query: string): Promise<AdminSearchResults> {
  return api.post<AdminSearchResults>("/admin/search", {query}, token);
}

export type AdminTicket = {
  id: string;
  ticketType: string;
  status: string;
  riderId: string;
  riderName: string | null;
  riderEmail: string | null;
  providerId: string | null;
  providerName: string | null;
  providerKind: string | null;
  paymentStatus: string | null;
  amount: number | null;
  createdAt: string | null;
  statusHistory: AdminTicketTimelineEntry[];
  description: string | null;
  symptom: string | null;
};

export function adminTickets(
  token: string,
  status?: string,
): Promise<AdminTicket[]> {
  return api.post<AdminTicket[]>(
    "/admin/tickets",
    status ? { status } : {},
    token,
  );
}

export type AdminPayment = {
  id: string;
  ticketId: string;
  riderUid: string;
  payeeId: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  disputeId?: string | null;
  disputedAt?: string | null;
  disputeHold?: boolean;
  disputeResolvedAt?: string | null;
  commissionRate: number | null;
  commissionAmount: number | null;
  payoutAmount: number | null;
  refundAmount: number | null;
  confirmedAt: string | null;
  createdAt: string;
  riderName: string | null;
  riderEmail: string | null;
  payeeName: string | null;
  payeeKind: string | null;
  ticketType: string | null;
  ticketStatus: string | null;
};

export function adminPayments(
  token: string,
  status?: string,
): Promise<AdminPayment[]> {
  return api.post<AdminPayment[]>(
    "/payments/all",
    status ? { status } : {},
    token,
  );
}

export function adminDismissDispute(
  token: string,
  payload: { disputeId: string; resolution?: string },
): Promise<AdminDispute> {
  return api.post<AdminDispute>("/disputes/dismiss", payload, token);
}

export type AdminReportTicket = {
  id: string;
  ticketType: string;
  status: string;
  symptom: string | null;
  description: string | null;
  waitingFee: number | null;
  finalAmount: number | null;
  paymentStatus: string | null;
  createdAt: string | null;
  statusHistory: AdminTicketTimelineEntry[];
};

export type AdminPersonContext = {
  kind: "RIDER" | "PROVIDER";
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  status: string | null;
  providerKind?: string | null;
  suspended?: boolean;
  accepting?: boolean;
  ratingAvg: number;
  ratingCount: number;
  trustScore: number;
  declineCount?: number;
  standingScore: number | null;
  bookingBlocked: boolean;
  restrictedUntil: string | null;
  restrictionReason: string | null;
  conductFlag: boolean;
  openReports: number;
  totalReports: number;
};

export type AdminReport = {
  id: string;
  targetKind: "PROVIDER" | "RIDER";
  targetId: string;
  targetUid: string | null;
  reportedBy: string;
  reporterName?: string;
  targetName?: string;
  ticketId: string | null;
  reason: string;
  note: string | null;
  photoUrls: string[];
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  action: "NONE" | "WARN" | "RESTRICT" | "SUSPEND" | "BLOCK";
  actionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  ticket: AdminReportTicket | null;
  targetContext: AdminPersonContext | null;
  reporterContext: AdminPersonContext | null;
};

export function adminReports(
  token: string,
  targetKind?: string,
  status?: string,
): Promise<{ reports: AdminReport[] }> {
  return api.post<{ reports: AdminReport[] }>(
    "/admin/reports",
    {
      ...(targetKind ? { targetKind } : {}),
      ...(status ? { status } : {}),
    },
    token,
  );
}

export function adminDecideReport(
  token: string,
  payload: { reportId: string; action: string; note?: string },
): Promise<AdminReport> {
  return api.post<AdminReport>("/admin/reports/decide", payload, token);
}

export type AdminAppeal = {
  id: string;
  subjectKind: "RATING" | "REPORT" | "DISPUTE";
  subjectId: string;
  ticketId: string | null;
  filedBy: string;
  reason: string;
  note: string | null;
  photoUrls: string[];
  snapshot: Record<string, unknown>;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  resolution: string | null;
  decisionNote: string | null;
  adjustedAmount: number | null;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
  appellantName: string;
};

export function adminAppeals(
  token: string,
  subjectKind?: string,
  status?: string,
): Promise<AdminAppeal[]> {
  return api.post<AdminAppeal[]>(
    "/admin/appeals",
    {
      ...(subjectKind ? { subjectKind } : {}),
      ...(status ? { status } : {}),
    },
    token,
  );
}

export function adminDecideAppeal(
  token: string,
  payload: {
    appealId: string;
    resolution: string;
    note: string;
    adjustedAmount?: number;
  },
): Promise<AdminAppeal> {
  return api.post<AdminAppeal>("/admin/appeals/decide", payload, token);
}

export function adminClearRestriction(
  token: string,
  payload: { targetKind: "PROVIDER" | "RIDER"; targetId: string },
): Promise<{ cleared: boolean }> {
  return api.post<{ cleared: boolean }>(
    "/admin/reports/restriction/clear",
    payload,
    token,
  );
}

export type AdminStanding = {
  score: number;
  bookingBlocked: boolean;
  restrictedUntil: string | null;
  restrictionReason: string | null;
  conductFlag: boolean;
  events: Array<Record<string, unknown>>;
};

export function adminUserStanding(
  token: string,
  userId: string,
): Promise<AdminStanding> {
  return api.post<AdminStanding>("/admin/users/standing", { userId }, token);
}

export function adminResetStanding(
  token: string,
  userId: string,
): Promise<AdminStanding> {
  return api.post<AdminStanding>(
    "/admin/users/standing/reset",
    { userId },
    token,
  );
}
