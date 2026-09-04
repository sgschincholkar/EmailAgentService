import { describe, expect, it } from "vitest";

import { EmailDocumentEditCommandSchema } from "./email-document-edit-schema";

function baseCommand(edits: unknown[]) {
  return { baseDocumentId: "doc-1", expectedVersion: 1, edits };
}

describe("EmailDocumentEditCommandSchema", () => {
  it("accepts a valid document subject edit", () => {
    const result = EmailDocumentEditCommandSchema.safeParse(
      baseCommand([{ target: "document", field: "subject", value: "New subject" }]),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a valid preheader edit", () => {
    const result = EmailDocumentEditCommandSchema.safeParse(
      baseCommand([{ target: "document", field: "preheader", value: "New preheader" }]),
    );
    expect(result.success).toBe(true);
  });

  it.each(["headline", "body", "event_details", "offer_details"])(
    "accepts a valid text-block edit for %s",
    (blockId) => {
      const result = EmailDocumentEditCommandSchema.safeParse(
        baseCommand([{ target: "block", blockId, field: "content", value: "New text" }]),
      );
      expect(result.success).toBe(true);
    },
  );

  it("accepts valid CTA label and href edits", () => {
    const result = EmailDocumentEditCommandSchema.safeParse(
      baseCommand([
        { target: "block", blockId: "cta", field: "label", value: "Buy now" },
        { target: "block", blockId: "cta", field: "href", value: "https://example.com" },
      ]),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a valid image alt-text edit", () => {
    const result = EmailDocumentEditCommandSchema.safeParse(
      baseCommand([{ target: "block", blockId: "hero_image", field: "altText", value: "A photo" }]),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a footer edit — footer is not an allowed blockId", () => {
    const result = EmailDocumentEditCommandSchema.safeParse(
      baseCommand([{ target: "block", blockId: "footer", field: "content", value: "x" }]),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an asset ID edit — not a recognized field", () => {
    const result = EmailDocumentEditCommandSchema.safeParse(
      baseCommand([{ target: "block", blockId: "hero_image", field: "assetId", value: "x" }]),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an unknown block ID", () => {
    const result = EmailDocumentEditCommandSchema.safeParse(
      baseCommand([{ target: "block", blockId: "sidebar", field: "content", value: "x" }]),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a wrong field/subtype combination — headline does not accept altText", () => {
    const result = EmailDocumentEditCommandSchema.safeParse(
      baseCommand([{ target: "block", blockId: "headline", field: "altText", value: "x" }]),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a wrong field/subtype combination — hero_image does not accept content", () => {
    const result = EmailDocumentEditCommandSchema.safeParse(
      baseCommand([{ target: "block", blockId: "hero_image", field: "content", value: "x" }]),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a wrong field/subtype combination — cta does not accept content", () => {
    const result = EmailDocumentEditCommandSchema.safeParse(
      baseCommand([{ target: "block", blockId: "cta", field: "content", value: "x" }]),
    );
    expect(result.success).toBe(false);
  });

  it("rejects duplicate edits to the same target/field in one command", () => {
    const result = EmailDocumentEditCommandSchema.safeParse(
      baseCommand([
        { target: "document", field: "subject", value: "First" },
        { target: "document", field: "subject", value: "Second" },
      ]),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an empty required value", () => {
    const result = EmailDocumentEditCommandSchema.safeParse(
      baseCommand([{ target: "document", field: "subject", value: "   " }]),
    );
    expect(result.success).toBe(false);
  });

  it("rejects HTML-like tags in text content", () => {
    const result = EmailDocumentEditCommandSchema.safeParse(
      baseCommand([
        { target: "block", blockId: "body", field: "content", value: "<script>alert(1)</script>" },
      ]),
    );
    expect(result.success).toBe(false);
  });

  it("accepts ordinary comparison symbols like < and >", () => {
    const result = EmailDocumentEditCommandSchema.safeParse(
      baseCommand([
        { target: "block", blockId: "body", field: "content", value: "Set up in <10 minutes, save > 20%." },
      ]),
    );
    expect(result.success).toBe(true);
  });

  it("rejects an edits array with zero entries", () => {
    const result = EmailDocumentEditCommandSchema.safeParse(baseCommand([]));
    expect(result.success).toBe(false);
  });

  it("rejects a command missing baseDocumentId or expectedVersion", () => {
    const result = EmailDocumentEditCommandSchema.safeParse({
      edits: [{ target: "document", field: "subject", value: "x" }],
    });
    expect(result.success).toBe(false);
  });

  it("does not accept a full arbitrary document replacement shape", () => {
    const result = EmailDocumentEditCommandSchema.safeParse({
      baseDocumentId: "doc-1",
      expectedVersion: 1,
      edits: [{ target: "document", field: "subject", value: "x" }],
      renderedHtml: "<p>hi</p>",
      blocks: [],
      status: "generated",
    });
    // Zod object schemas ignore unknown top-level keys by default, but the
    // client-supplied extras must never be read anywhere downstream — the
    // parsed .data below proves only the allowlisted shape survives.
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("renderedHtml");
      expect(result.data).not.toHaveProperty("blocks");
      expect(result.data).not.toHaveProperty("status");
    }
  });

  it("rejects a value over the max length for subject", () => {
    const result = EmailDocumentEditCommandSchema.safeParse(
      baseCommand([{ target: "document", field: "subject", value: "a".repeat(201) }]),
    );
    expect(result.success).toBe(false);
  });

  it("accepts a value at exactly the max length for subject", () => {
    const result = EmailDocumentEditCommandSchema.safeParse(
      baseCommand([{ target: "document", field: "subject", value: "a".repeat(200) }]),
    );
    expect(result.success).toBe(true);
  });
});
