import { describe, expect, it } from "vitest";

import type { BrandProfile } from "@/domain/schemas";

import {
  BRAND_PROFILE_STORAGE_KEY,
  getBrandProfile,
  loadBrandProfiles,
  upsertBrandProfile,
} from "./brand-profile-storage";

const profile: BrandProfile = {
  id: "brand-1",
  name: "Northstar Studio",
  colors: { primary: "#285E61" },
  emailFontStack: "Arial, Helvetica, sans-serif",
  tone: ["Warm"],
  preferredTerms: [],
  prohibitedTerms: [],
  defaultCtaStyle: "filled",
  defaultFooterHtml:
    "You are receiving this email because you subscribed to updates.",
  createdAt: "2026-09-04T06:00:00.000Z",
  updatedAt: "2026-09-04T06:00:00.000Z",
};

describe("temporary Brand Profile storage", () => {
  it("persists and reloads a schema-valid profile", () => {
    upsertBrandProfile(profile);

    expect(loadBrandProfiles()).toEqual([profile]);
    expect(getBrandProfile(profile.id)).toEqual(profile);
  });

  it("updates an existing profile without duplicating it", () => {
    upsertBrandProfile(profile);
    upsertBrandProfile({ ...profile, name: "Northstar & Co." });

    expect(loadBrandProfiles()).toHaveLength(1);
    expect(getBrandProfile(profile.id)?.name).toBe("Northstar & Co.");
  });

  it("ignores and clears malformed JSON", () => {
    window.localStorage.setItem(BRAND_PROFILE_STORAGE_KEY, "not-json");

    expect(loadBrandProfiles()).toEqual([]);
    expect(window.localStorage.getItem(BRAND_PROFILE_STORAGE_KEY)).toBeNull();
  });

  it("ignores and clears stored values that fail schema validation", () => {
    window.localStorage.setItem(
      BRAND_PROFILE_STORAGE_KEY,
      JSON.stringify([{ ...profile, colors: { primary: "blue" } }]),
    );

    expect(loadBrandProfiles()).toEqual([]);
    expect(window.localStorage.getItem(BRAND_PROFILE_STORAGE_KEY)).toBeNull();
  });

  it("refuses to persist invalid values", () => {
    expect(() =>
      upsertBrandProfile({ ...profile, tone: [] } as BrandProfile),
    ).toThrow();
    expect(window.localStorage.getItem(BRAND_PROFILE_STORAGE_KEY)).toBeNull();
  });
});
