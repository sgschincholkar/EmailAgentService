import { imageSize } from "image-size";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export type UploadValidationResult =
  | { ok: true; width: number; height: number }
  | { ok: false; error: string };

/**
 * Server-side upload acceptance: declared MIME type must be in the
 * allowlist, size must be within the limit, and image-size must
 * successfully parse real dimensions from the uploaded bytes. The client's
 * `accept` attribute and any client-reported MIME type are UX hints only —
 * this is the authoritative check.
 */
export function validateUpload(
  bytes: Buffer,
  mimeType: string,
): UploadValidationResult {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      ok: false,
      error: "Upload a PNG, JPEG, GIF, or WEBP image.",
    };
  }

  if (bytes.byteLength > MAX_SIZE_BYTES) {
    return {
      ok: false,
      error: "Images must be 5MB or smaller.",
    };
  }

  try {
    const { width, height } = imageSize(bytes);
    if (!width || !height) {
      return { ok: false, error: "This file isn't a readable image." };
    }
    return { ok: true, width, height };
  } catch {
    return { ok: false, error: "This file isn't a readable image." };
  }
}
