import { describe, expect, it } from "vitest";
import { en } from "../src/i18n/en";
import {
  bookingActions,
  bookingStatusLabel,
  providerStatusColor,
  providerStatusLabel,
  statusGroup,
  walkInActions,
} from "../src/screens/provider/actions";
import {
  draftsFromItems,
  draftsToItems,
  draftsTotal,
  emptyLine,
} from "../src/screens/provider/lineDrafts";

describe("walk-in provider actions", () => {
  it("offers accept and decline on a new request", () => {
    expect(walkInActions("1")).toEqual(["accept", "decline"]);
  });

  it("offers quoting after acceptance", () => {
    for (const status of ["2", "9", "10"]) {
      expect(walkInActions(status)).toEqual(["quote"]);
    }
  });

  it("offers work and ready while repairing", () => {
    expect(walkInActions("6")).toEqual(["work", "ready"]);
  });

  it("is read-only once ready or closed", () => {
    for (const status of ["7", "4", "5", "8", "12", "15"]) {
      expect(walkInActions(status)).toEqual([]);
    }
  });
});

describe("shop booking actions", () => {
  it("offers accept and decline for a request", () => {
    expect(bookingActions("REQUESTED", "DUE", 50000)).toEqual([
      "accept",
      "decline",
    ]);
  });

  it("offers deposit handling after arrival", () => {
    expect(bookingActions("ARRIVED", "DUE", 50000)).toEqual([
      "requestDeposit",
      "collectDeposit",
      "waiveDeposit",
      "complete",
    ]);
    expect(bookingActions("ARRIVED", "REQUESTED", 50000)).toEqual([
      "collectDeposit",
      "complete",
    ]);
  });

  it("completes a confirmed booking and leaves past bookings alone", () => {
    expect(bookingActions("CONFIRMED", "NONE", 0)).toEqual(["complete"]);
    expect(bookingActions("COMPLETED", "NONE", 0)).toEqual([]);
  });
});

describe("provider labels", () => {
  it("groups walk-in statuses", () => {
    expect(statusGroup("1")).toBe("new");
    expect(statusGroup("6")).toBe("active");
    expect(statusGroup("4")).toBe("closed");
  });

  it("labels statuses from the shared strings", () => {
    expect(providerStatusLabel("1", en)).toBe(en.admin.statusPending);
    expect(providerStatusLabel("6", en)).toBe(en.admin.statusInProgress);
    expect(providerStatusLabel("99", en)).toBe("99");
    expect(providerStatusColor("4")).toBe("success");
    expect(providerStatusColor("5")).toBe("error");
    expect(bookingStatusLabel("REQUESTED", en)).toBe(en.bookings.requested);
    expect(bookingStatusLabel("COMPLETED", en)).toBe(en.bookings.completed);
  });
});

describe("line item drafts", () => {
  it("starts with one blank line", () => {
    expect(draftsFromItems(null)).toEqual([emptyLine()]);
  });

  it("drops incomplete lines and converts numeric fields", () => {
    expect(draftsToItems([
      { name: "Brake pads", qty: "2", unitPrice: "120000" },
      { name: "", qty: "1", unitPrice: "50000" },
      { name: "Chain", qty: "0", unitPrice: "100000" },
    ])).toEqual([
      { name: "Brake pads", qty: 2, unitPrice: 120000 },
    ]);
  });

  it("totals valid line items", () => {
    expect(draftsTotal([
      { name: "Brake pads", qty: "2", unitPrice: "120000" },
      { name: "Labour", qty: "1", unitPrice: "80000" },
    ])).toBe(320000);
  });
});
