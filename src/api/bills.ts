import { api } from "./client";

export type BillPayment = {
  id: string;
  method: string;
  status: string;
  amount: number;
  refundAmount: number | null;
  commissionRate: number | null;
  commissionAmount: number | null;
  payoutAmount: number | null;
  payoutRef: string | null;
  payoutAt: string | null;
  payoutStatus: string;
  canConfirmCash: boolean;
  disputeId?: string | null;
  disputedAt?: string | null;
  disputeHold?: boolean;
  disputeResolvedAt?: string | null;
};

export type BillItem = {
  kind: string;
  ticketId: string;
  ticketType: string;
  ticketStatus: string;
  amount: number;
  waitingFee: number;
  distanceKm?: number | null;
  warrantyUntil?: string | null;
  refundRequest?: {
    id: string;
    status: string;
    amount: number;
    transferRef: string | null;
    requestedAt: string;
  } | null;
  breakdown?: Array<{ label: string; amount: number; detail: string | null }>;
  items?: Array<{
    lineId?: string;
    kind?: string;
    serviceCode?: string;
    category?: string;
    name: string;
    qty: number;
    unitPrice: number;
    amount: number;
    priceMode?: string;
    listPrice?: number;
    warrantyDays?: number;
    warrantyUntil?: string | null;
    note?: string;
    legacy?: boolean;
  }>;
  services?: Array<{
    lineId?: string;
    serviceCode?: string;
    category?: string;
    name: string;
    qty: number;
    unitPrice: number;
    amount: number;
    priceMode?: string;
    warrantyUntil?: string | null;
  }>;
  extras?: Array<{
    lineId?: string;
    name: string;
    qty: number;
    unitPrice: number;
    amount: number;
    note?: string;
  }>;
  status: string;
  payeeId: string | null;
  ratingTargetId?: string | null;
  payeeName: string | null;
  qrUrl: string | null;
  dispute: {
    id: string;
    status: string;
    type: string;
    reasonCode: string;
    outcome: string | null;
    resolution: string | null;
    createdAt: string;
    resolvedAt: string | null;
  } | null;
  disputes?: Array<{
    id: string;
    status: string;
    type: string;
    reasonCode: string;
    outcome: string | null;
    createdAt: string;
    resolvedAt: string | null;
  }>;
  payment: BillPayment | null;
};

export type Bill = {
  billId: string;
  ticketId: string;
  ticketType: string;
  ticketStatus: string;
  createdAt: string | null;
  currency: string;
  total: number;
  paid: number;
  due: number;
  status: string;
  viewer: string;
  canPay: boolean;
  items: BillItem[];
};

export function myBills(token: string, limit?: number): Promise<Bill[]> {
  return api.post<Bill[]>("/bills/all", typeof limit === "number" ? { limit } : {}, token);
}

export function payeeBills(token: string, limit?: number): Promise<Bill[]> {
  return api.post<Bill[]>("/bills/payee", typeof limit === "number" ? { limit } : {}, token);
}

export function fetchBill(
  token: string,
  params: { ticketId?: string; billId?: string; scope?: "payee" },
): Promise<Bill> {
  return api.post<Bill>("/bills/one", params, token);
}

export function requestInvoice(
  ticketId: string,
  token: string,
): Promise<{
  invoiceId: string;
  number: string;
  url: string;
  expiresAt: string;
  status: string;
}> {
  return api.post("/bills/invoice", { ticketId }, token);
}
