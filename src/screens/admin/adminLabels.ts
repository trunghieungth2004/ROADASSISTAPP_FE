import type { Strings } from "../../i18n";

export type AdminTone = "default" | "primary" | "success" | "warning" | "error" | "info";

export function humanizeEnum(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function adminStatusLabel(value: string, t: Strings): string {
  if (value === "OPEN") return t.admin.statusOpen;
  if (value === "PENDING") return t.admin.statusPending;
  if (value === "MATCHED") return t.admin.statusMatched;
  if (value === "ARRIVED") return t.admin.statusArrived;
  if (value === "RESOLVED") return t.admin.statusResolved;
  if (value === "CANCELLED") return t.admin.statusCancelled;
  if (value === "DECLINED") return t.admin.statusDeclined;
  if (value === "DISMISSED") return t.admin.statusDismissed;
  if (value === "APPROVED") return t.admin.statusApproved;
  if (value === "SENT") return t.admin.statusSent;
  if (value === "REJECTED") return t.admin.statusRejected;
  if (value === "FAILED") return t.admin.statusFailed;
  if (value === "PAID") return t.admin.statusPaid;
  if (value === "SETTLED") return t.admin.statusSettled;
  if (value === "REQUESTED") return t.admin.statusRequested;
  if (value === "HELD") return t.admin.statusHeld;
  if (value === "REFUNDED") return t.admin.statusRefunded;
  if (value === "PARTIAL") return t.admin.statusPartiallyRefunded;
  if (value === "CONFIRMED") return t.admin.statusConfirmed;
  if (value === "COMPLETED") return t.admin.statusCompleted;
  if (value === "REBOOKED") return t.admin.statusRebooked;
  if (value === "DISPUTED") return t.admin.statusDisputed;
  if (value === "ANSWERED") return t.admin.statusAnswered;
  if (value === "CLOSED") return t.admin.statusClosed;
  if (value === "ACTIVE") return t.admin.active;
  if (value === "INACTIVE") return t.admin.statusInactive;
  if (value === "BLOCKED") return t.admin.blocked;
  if (value === "SUSPENDED") return t.admin.statusSuspended;
  return humanizeEnum(value);
}

export function adminStatusTone(value: string): AdminTone {
  if (["OPEN", "PENDING", "REQUESTED", "APPROVED", "SENT", "HELD", "PARTIAL", "DISPUTED", "REBOOKED"].includes(value)) {
    return "warning";
  }
  if (["RESOLVED", "CONFIRMED", "PAID", "SETTLED", "COMPLETED", "ACTIVE"].includes(value)) {
    return "success";
  }
  if (["CANCELLED", "DECLINED", "REJECTED", "FAILED", "INACTIVE", "BLOCKED", "SUSPENDED"].includes(value)) {
    return "error";
  }
  return "default";
}

export function reportActionLabel(value: string, t: Strings): string {
  if (value === "WARN") return t.admin.actionWarn;
  if (value === "RESTRICT") return t.admin.actionRestrict;
  if (value === "SUSPEND") return t.admin.actionSuspend;
  if (value === "BLOCK") return t.admin.actionBlock;
  return t.admin.actionNone;
}

export function disputeOutcomeLabel(value: string, t: Strings): string {
  if (value === "SHOP") return t.admin.outcomeProviderFavor;
  if (value === "RIDER") return t.admin.outcomeRiderFavor;
  if (value === "PARTIAL") return t.admin.outcomePartial;
  return humanizeEnum(value);
}

export function appealResolutionLabel(value: string, t: Strings): string {
  if (value === "KEEP") return t.admin.keepRating;
  if (value === "REMOVE") return t.admin.removeRating;
  if (value === "UPHOLD") return t.admin.appealUphold;
  if (value === "OVERTURN") return t.admin.appealOverturn;
  if (value === "ADJUST") return t.admin.appealAdjust;
  return humanizeEnum(value);
}

export function appealSubjectLabel(value: string, t: Strings): string {
  if (value === "RATING") return t.admin.appealRating;
  if (value === "REPORT") return t.admin.appealReport;
  if (value === "DISPUTE") return t.admin.appealDispute;
  return humanizeEnum(value);
}
