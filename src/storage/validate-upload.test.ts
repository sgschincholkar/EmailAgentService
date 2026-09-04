import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateUpload } from "./validate-upload";

const FIXTURES_DIR = path.join(process.cwd(), "src/renderer/fixtures/images");
const validPng = readFileSync(path.join(FIXTURES_DIR, "logo.png"));

describe("validateUpload", () => {
  it("accepts a valid PNG under the size limit", () => {
    const result = validateUpload(validPng, "image/png");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    }
  });

  it("rejects a disallowed MIME type", () => {
    const result = validateUpload(validPng, "application/pdf");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/PNG, JPEG, GIF, or WEBP/);
    }
  });

  it("rejects an executable disguised with an image MIME type", () => {
    const notAnImage = Buffer.from("MZ\x90\x00 this is not image data");
    const result = validateUpload(notAnImage, "image/png");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("This file isn't a readable image.");
    }
  });

  it("rejects a file over 5MB", () => {
    const oversized = Buffer.concat([validPng, Buffer.alloc(6 * 1024 * 1024)]);
    const result = validateUpload(oversized, "image/png");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Images must be 5MB or smaller.");
    }
  });

  it("accepts a file just under 5MB", () => {
    // Pad with trailing bytes after the PNG so it stays a valid, parseable
    // PNG while pushing size close to (but under) the 5MB limit.
    const padded = Buffer.concat([
      validPng,
      Buffer.alloc(5 * 1024 * 1024 - validPng.byteLength - 1024),
    ]);
    expect(padded.byteLength).toBeLessThan(5 * 1024 * 1024);
    const result = validateUpload(padded, "image/png");
    expect(result.ok).toBe(true);
  });

  it("accepts png, jpeg, gif, and webp MIME types", () => {
    for (const mimeType of ["image/png", "image/jpeg", "image/gif", "image/webp"]) {
      // Only the PNG bytes will actually parse; MIME allowlist check runs
      // first and independently, so this only verifies the allowlist itself
      // doesn't reject these four types outright.
      const result = validateUpload(validPng, mimeType);
      if (mimeType === "image/png") {
        expect(result.ok).toBe(true);
      } else {
        // image-size will fail to parse PNG bytes as e.g. jpeg — that's a
        // parse failure, not a MIME allowlist rejection. Assert the error
        // message differs from the MIME-rejection message.
        if (!result.ok) {
          expect(result.error).not.toMatch(/PNG, JPEG, GIF, or WEBP/);
        }
      }
    }
  });

  it("rejects unsupported file types like pdf, exe, and txt", () => {
    for (const mimeType of ["application/pdf", "application/x-msdownload", "text/plain"]) {
      const result = validateUpload(validPng, mimeType);
      expect(result.ok).toBe(false);
    }
  });
});
