import { describe, expect, it } from "vitest";

import { LayoutIdSchema } from "@/domain/schemas";

import {
  LAYOUT_LABELS,
  incompatibleFactKeysOnTypeChange,
  typeSpecificFactKeys,
} from "./campaign-facts";

describe("LayoutIdSchema", () => {
  it("accepts exactly the four fixed layout ids", () => {
    const values = LayoutIdSchema.options;
    expect(values).toEqual([
      "hero_cta",
      "webinar_event",
      "text_announcement",
      "promotion_offer",
    ]);
  });

  it("has a customer-facing label for every layout id", () => {
    for (const value of LayoutIdSchema.options) {
      expect(LAYOUT_LABELS[value]).toBeTruthy();
    }
  });
});

describe("incompatibleFactKeysOnTypeChange", () => {
  it("returns no dropped keys when the type is unchanged", () => {
    expect(
      incompatibleFactKeysOnTypeChange("webinar", "webinar", ["eventDateText"]),
    ).toEqual([]);
  });

  it("returns no dropped keys when nothing type-specific is populated", () => {
    expect(incompatibleFactKeysOnTypeChange("webinar", "promotion", [])).toEqual([]);
  });

  it("flags populated webinar facts as incompatible when switching to promotion", () => {
    const dropped = incompatibleFactKeysOnTypeChange("webinar", "promotion", [
      "eventDateText",
      "speakerText",
    ]);
    expect(dropped).toEqual(["eventDateText", "speakerText"]);
  });

  it("keeps facts that remain valid for the new type", () => {
    const dropped = incompatibleFactKeysOnTypeChange(
      "feature_launch",
      "announcement",
      ["productOrFeatureName"],
    );
    expect(dropped).toEqual([]);
  });

  it("exposes the type-specific fact keys used for compatibility checks", () => {
    expect(typeSpecificFactKeys("promotion")).toEqual([
      "offerText",
      "priceText",
      "discountText",
    ]);
    expect(typeSpecificFactKeys("newsletter")).toEqual([]);
  });
});
