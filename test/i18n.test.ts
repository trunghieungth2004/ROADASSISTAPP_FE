import { describe, expect, it } from "vitest";
import { en } from "../src/i18n/en";
import { vi } from "../src/i18n/vi";

function flatten(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => flatten(child, prefix === "" ? key : `${prefix}.${key}`),
  );
}

describe("i18n parity", () => {
  it("English and Vietnamese expose the same keys", () => {
    const enKeys = flatten(en).sort();
    const viKeys = flatten(vi).sort();
    expect(viKeys).toEqual(enKeys);
  });

  it("has no empty strings", () => {
    for (const [lang, strings] of Object.entries({ en, vi })) {
      for (const key of flatten(strings)) {
        const parts = key.split(".");
        let node: unknown = strings;
        for (const part of parts) {
          node = (node as Record<string, unknown>)[part];
        }
        expect(typeof node, `${lang}.${key}`).toBe("string");
        expect((node as string).trim(), `${lang}.${key}`).not.toBe("");
      }
    }
  });
});
