import { describe, expect, it } from "vitest";
import { en } from "../src/i18n/en";
import {
  configTypeLabel,
  flagTypeLabel,
  tierLabel,
  vehicleTypeLabel,
} from "../src/i18n/labels";

describe("label helpers", () => {
  it("maps vehicle types and falls back to the raw value", () => {
    expect(vehicleTypeLabel("CAR", en)).toBe(en.vehicle.types.CAR);
    expect(vehicleTypeLabel("BOAT", en)).toBe("BOAT");
  });

  it("maps config types and falls back", () => {
    expect(configTypeLabel("CARGO", en)).toBe(en.vehicle.configs.CARGO);
    expect(configTypeLabel("UNKNOWN", en)).toBe("UNKNOWN");
  });

  it("maps flag types and falls back", () => {
    expect(flagTypeLabel("FLOOD", en)).toBe(en.flag.flood);
    expect(flagTypeLabel("OTHER", en)).toBe("OTHER");
  });

  it("maps hazard tiers and falls back", () => {
    expect(tierLabel("TIER1", en)).toBe(en.hazards.tiers.TIER1);
    expect(tierLabel("TIER9", en)).toBe("TIER9");
  });
});
