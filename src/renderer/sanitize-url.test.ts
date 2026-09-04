import { describe, expect, it } from "vitest";

import { RenderError } from "./render-error";
import { sanitizeUrl } from "./sanitize-url";

describe("sanitizeUrl", () => {
  it("accepts https URLs", () => {
    expect(sanitizeUrl("https://example.com/path", {})).toBe(
      "https://example.com/path",
    );
  });

  it("accepts http URLs", () => {
    expect(sanitizeUrl("http://example.com", {})).toBe("http://example.com");
  });

  it("rejects javascript: URLs", () => {
    expect(() => sanitizeUrl("javascript:alert(1)", { blockId: "cta" })).toThrow(
      RenderError,
    );
  });

  it("rejects data: URLs", () => {
    expect(() => sanitizeUrl("data:text/html,<script>", {})).toThrow(RenderError);
  });

  it("rejects an empty URL", () => {
    expect(() => sanitizeUrl("", {})).toThrow(RenderError);
  });

  it("rejects a malformed URL", () => {
    expect(() => sanitizeUrl("not a url", {})).toThrow(RenderError);
  });

  it("attaches blockId and slotId to the thrown error", () => {
    try {
      sanitizeUrl("javascript:alert(1)", { blockId: "cta", slotId: "cta" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RenderError);
      const renderError = error as RenderError;
      expect(renderError.code).toBe("unsafe_asset_url");
      expect(renderError.blockId).toBe("cta");
      expect(renderError.slotId).toBe("cta");
    }
  });
});
