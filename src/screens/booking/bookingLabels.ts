import type { Strings } from "../../i18n";

export type StatusColor =
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning";

export function bookingStatusLabel(status: string, t: Strings): string {
  if (status === "REQUESTED") return t.bookings.requested;
  if (status === "CONFIRMED") return t.bookings.confirmed;
  if (status === "DECLINED") return t.bookings.declined;
  if (status === "CANCELLED") return t.bookings.cancelled;
  if (status === "ARRIVED") return t.bookings.arrived;
  if (status === "COMPLETED") return t.bookings.completed;
  if (status === "NO_SHOW") return t.bookings.noShow;
  return status;
}

export function bookingStatusColor(status: string): StatusColor {
  if (status === "REQUESTED") return "warning";
  if (status === "CONFIRMED") return "primary";
  if (status === "ARRIVED") return "info";
  if (status === "COMPLETED") return "success";
  if (status === "DECLINED" || status === "CANCELLED") return "error";
  return "default";
}
