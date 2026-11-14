import { describe, expect, it } from "vitest";
import type { Provider } from "../src/api/providers";
import { en } from "../src/i18n/en";
import {
  profileRoleLabel,
  profileServiceKinds,
} from "../src/screens/more/profileKinds";

const provider = (kind: string, status = "ACTIVE") =>
  ({ kind, status } as Provider);

describe("profile role merging", () => {
  it("adds TOW and MOBILE_SHOP from operated providers", () => {
    expect(profileServiceKinds(
      ["RIDER"],
      [provider("SHOP"), provider("TOW"), provider("MOBILE_SHOP")],
    )).toEqual(["SHOP", "TOW", "MOBILE_SHOP"]);
  });

  it("keeps service licenses and ignores denied providers", () => {
    expect(profileServiceKinds(
      ["RIDER", "SHOP"],
      [provider("TOW"), provider("MOBILE_SHOP", "DENIED")],
    )).toEqual(["SHOP", "TOW"]);
  });

  it("does not repeat RIDER in the service chips", () => {
    expect(profileServiceKinds(["RIDER"], [])).toEqual([]);
  });

  it("uses the rider or provider role label", () => {
    expect(profileRoleLabel(["RIDER"], false, en)).toBe(en.roles.rider);
    expect(profileRoleLabel(["TOW"], false, en)).toBe(en.more.roleUser);
    expect(profileRoleLabel(["RIDER"], true, en)).toBe(en.more.roleAdmin);
  });
});
