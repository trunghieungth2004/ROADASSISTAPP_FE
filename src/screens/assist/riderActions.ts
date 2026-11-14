import type { Strings } from "../../i18n";
import type { StatusColor } from "../booking/bookingLabels";

export type RiderAction = "cancel" | "approve" | "decline" | "resolve";

const TERMINAL = new Set(["4", "5", "8", "12", "15"]);
const CANCELABLE = new Set([
  "1",
  "2",
  "3",
  "7",
  "9",
  "11",
  "13",
  "14",
]);

export function isTerminalStatus(status: string): boolean {
  return TERMINAL.has(status);
}

export function canRiderCancel(ticketType: string, status: string): boolean {
  if (!CANCELABLE.has(status)) return false;
  return !(ticketType === "SOS" && status === "7");
}

export function canApproveRiderQuote(
  ticketType: string,
  status: string,
): boolean {
  return status === "9" &&
    (ticketType === "SOS" ||
      ticketType === "WALK_IN" ||
      ticketType === "MECHANIC");
}

export function canResolveRider(
  ticketType: string,
  status: string,
): boolean {
  return status === "7" &&
    (ticketType === "SOS" ||
      ticketType === "WALK_IN" ||
      ticketType === "MECHANIC");
}

export function riderActions(
  ticketType: string,
  status: string,
): RiderAction[] {
  const actions: RiderAction[] = [];
  if (canRiderCancel(ticketType, status)) actions.push("cancel");
  if (canApproveRiderQuote(ticketType, status)) {
    actions.push("approve", "decline");
  }
  if (canResolveRider(ticketType, status)) actions.push("resolve");
  return actions;
}

const STATUS_LABELS: Record<string, keyof Strings["admin"]> = {
  "1": "statusPending",
  "2": "statusMatched",
  "3": "statusArrived",
  "4": "statusResolved",
  "5": "statusCancelled",
  "6": "statusInProgress",
  "7": "statusReady",
  "8": "statusDeclined",
  "9": "statusQuoted",
  "10": "statusInShop",
  "11": "statusFinalQuoted",
  "12": "statusResolvedUnfixable",
  "13": "statusEstimated",
  "14": "statusEstApproved",
  "15": "statusUnfixable",
};

export function riderStatusLabel(status: string, t: Strings): string {
  const key = STATUS_LABELS[status];
  return key ? String(t.admin[key]) : status;
}

export function riderStatusColor(status: string): StatusColor {
  if (status === "4" || status === "7") return "success";
  if (["5", "8", "12", "15"].includes(status)) return "error";
  if (status === "6" || status === "9") return "warning";
  if (status === "10" || status === "3") return "info";
  if (status === "2") return "primary";
  return "default";
}

export function ticketTypeLabel(ticketType: string, t: Strings): string {
  if (ticketType === "SOS") return t.assist.typeSos;
  if (ticketType === "TOW") return t.assist.typeTow;
  if (ticketType === "WALK_IN") return t.assist.typeWalkIn;
  if (ticketType === "MECHANIC") return t.assist.typeMechanic;
  return ticketType;
}
