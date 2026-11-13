import type { Strings } from "../../i18n/en";

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

export function ticketStatusLabel(status: string, t: Strings): string {
  const key = STATUS_LABELS[status];
  return key ? String(t.admin[key]) : status;
}
