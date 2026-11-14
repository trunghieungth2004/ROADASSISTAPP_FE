import type { Strings } from "../../i18n";

export type WalkInAction = "accept" | "decline" | "quote" | "work" | "ready";

export type BookingAction =
  | "accept"
  | "decline"
  | "complete"
  | "requestDeposit"
  | "collectDeposit"
  | "waiveDeposit";

export type JobGroup = "new" | "active" | "closed";

export type StatusColor =
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning";

const CLOSED_STATUSES = new Set(["4", "5", "8", "12", "15"]);

export function walkInActions(status: string): WalkInAction[] {
  if (status === "1") return ["accept", "decline"];
  if (status === "2" || status === "9" || status === "10") return ["quote"];
  if (status === "6") return ["work", "ready"];
  return [];
}

export function bookingActions(
  status: string,
  depositStatus: string,
  depositAmount: number,
): BookingAction[] {
  if (status === "REQUESTED") return ["accept", "decline"];
  if (status !== "CONFIRMED" && status !== "ARRIVED") return [];
  const actions: BookingAction[] = [];
  if (status === "ARRIVED" && depositAmount > 0) {
    if (depositStatus === "DUE") {
      actions.push("requestDeposit", "collectDeposit", "waiveDeposit");
    } else if (depositStatus === "REQUESTED") {
      actions.push("collectDeposit");
    }
  }
  actions.push("complete");
  return actions;
}

export function statusGroup(status: string): JobGroup {
  if (status === "1") return "new";
  if (CLOSED_STATUSES.has(status)) return "closed";
  return "active";
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

export function providerStatusLabel(status: string, t: Strings): string {
  const key = STATUS_LABELS[status];
  return key ? String(t.admin[key]) : status;
}

export function providerStatusColor(status: string): StatusColor {
  if (status === "4" || status === "7") return "success";
  if (["5", "8", "12", "15"].includes(status)) return "error";
  if (status === "6" || status === "9") return "warning";
  if (status === "10") return "info";
  if (status === "2") return "primary";
  return "default";
}

export {
  bookingStatusLabel,
  bookingStatusColor,
} from "../booking/bookingLabels";
