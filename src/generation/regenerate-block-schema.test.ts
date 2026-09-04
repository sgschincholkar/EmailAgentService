import { describe, expect, it } from "vitest";

import { RegenerateBlockRequestSchema } from "./regenerate-block-schema";

describe("RegenerateBlockRequestSchema", () => {
  it("accepts each eligible block id", () => {
    for (const blockId of ["headline", "body", "event_details", "offer_details", "hero_image"]) {
      const result = RegenerateBlockRequestSchema.safeParse({
        baseDocumentId: "doc-1",
        expectedVersion: 1,
        blockId,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects cta", () => {
    const result = RegenerateBlockRequestSchema.safeParse({
      baseDocumentId: "doc-1",
      expectedVersion: 1,
      blockId: "cta",
    });
    expect(result.success).toBe(false);
  });

  it("rejects footer", () => {
    const result = RegenerateBlockRequestSchema.safeParse({
      baseDocumentId: "doc-1",
      expectedVersion: 1,
      blockId: "footer",
    });
    expect(result.success).toBe(false);
  });

  it("rejects subject and preheader", () => {
    for (const blockId of ["subject", "preheader"]) {
      const result = RegenerateBlockRequestSchema.safeParse({
        baseDocumentId: "doc-1",
        expectedVersion: 1,
        blockId,
      });
      expect(result.success).toBe(false);
    }
  });

  it("rejects an unknown block id", () => {
    const result = RegenerateBlockRequestSchema.safeParse({
      baseDocumentId: "doc-1",
      expectedVersion: 1,
      blockId: "not_a_real_block",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive expectedVersion", () => {
    const result = RegenerateBlockRequestSchema.safeParse({
      baseDocumentId: "doc-1",
      expectedVersion: 0,
      blockId: "headline",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing baseDocumentId", () => {
    const result = RegenerateBlockRequestSchema.safeParse({
      expectedVersion: 1,
      blockId: "headline",
    });
    expect(result.success).toBe(false);
  });
});
