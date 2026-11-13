import { api } from "./client";

export type TicketPayment = {
  id: string;
  ticketId: string;
  method: string;
  status: string;
  amount?: number | null;
  checkoutUrl?: string | null;
};

type PaymentWire = TicketPayment & {
  checkout?: { qrUrl?: string | null } | null;
};

function toPayment(raw: PaymentWire): TicketPayment {
  return {
    id: raw.id,
    ticketId: raw.ticketId,
    method: raw.method,
    status: raw.status,
    amount: typeof raw.amount === "number" ? raw.amount : null,
    checkoutUrl:
      typeof raw.checkout?.qrUrl === "string" && raw.checkout.qrUrl !== ""
        ? raw.checkout.qrUrl
        : null,
  };
}

export async function createPayment(
  ticketId: string,
  method: "CASH" | "SEPAY",
  token: string,
): Promise<TicketPayment> {
  return toPayment(
    await api.post<PaymentWire>("/payments/create", { ticketId, method }, token),
  );
}

export async function confirmCashReceipt(
  ticketId: string,
  token: string,
): Promise<TicketPayment> {
  return toPayment(
    await api.post<PaymentWire>("/payments/confirm-cash", { ticketId }, token),
  );
}

export async function fetchTicketPayments(
  ticketId: string,
  token: string,
): Promise<TicketPayment[]> {
  const rows = await api.post<PaymentWire[]>("/payments/one", { ticketId }, token);
  return Array.isArray(rows) ? rows.map(toPayment) : [];
}

export function paymentMethodLabel(method: string | null | undefined): string {
  if (method === "SEPAY") return "SePay";
  if (method === "CASH") return "Cash";
  return method ?? "—";
}

export function paymentStatusLabel(status: string | null | undefined): string {
  if (status === "PENDING") return "Pending";
  if (status === "HELD") return "Held";
  if (status === "CONFIRMED") return "Confirmed";
  if (status === "REFUNDED") return "Refunded";
  if (status === "PARTIAL") return "Partially refunded";
  if (status === "CANCELLED") return "Cancelled";
  return status ?? "—";
}
