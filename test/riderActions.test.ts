import { describe, expect, it } from "vitest";
import { en } from "../src/i18n/en";
import {
  canApproveRiderQuote,
  canResolveRider,
  canRiderCancel,
  riderActions,
  riderStatusLabel,
  ticketTypeLabel,
} from "../src/screens/assist/riderActions";

describe("rider ticket actions", () => {
  it("cancels in the same statuses as the mobile app", () => {
    for (const status of ["1", "2", "3", "7", "9", "11", "13", "14"]) {
      expect(canRiderCancel("WALK_IN", status)).toBe(true);
    }
    for (const status of ["4", "5", "6", "8", "10", "12", "15"]) {
      expect(canRiderCancel("WALK_IN", status)).toBe(false);
    }
    expect(canRiderCancel("SOS", "7")).toBe(false);
    expect(canRiderCancel("SOS", "3")).toBe(true);
  });

  it("allows quote decisions only at quoted", () => {
    expect(canApproveRiderQuote("SOS", "9")).toBe(true);
    expect(canApproveRiderQuote("WALK_IN", "9")).toBe(true);
    expect(canApproveRiderQuote("TOW", "9")).toBe(false);
    expect(canApproveRiderQuote("SOS", "6")).toBe(false);
  });

  it("resolves shop and SOS tickets at ready", () => {
    expect(canResolveRider("SOS", "7")).toBe(true);
    expect(canResolveRider("WALK_IN", "7")).toBe(false);
    expect(canResolveRider("TOW", "7")).toBe(false);
  });

  it("combines actions by status", () => {
    expect(riderActions("SOS", "9")).toEqual(["cancel", "approve", "decline"]);
    expect(riderActions("SOS", "7")).toEqual(["resolve"]);
    expect(riderActions("WALK_IN", "7")).toEqual([
      "cancel",
      "approveInvoice",
    ]);
    expect(riderActions("TOW", "4")).toEqual([]);
  });

  it("labels type and status", () => {
    expect(ticketTypeLabel("SOS", en)).toBe(en.assist.typeSos);
    expect(ticketTypeLabel("WALK_IN", en)).toBe(en.assist.typeWalkIn);
    expect(riderStatusLabel("7", en)).toBe(en.admin.statusReady);
  });
});
