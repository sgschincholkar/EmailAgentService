import { HttpUrlSchema } from "@/domain/schemas";

import { RenderError } from "./render-error";

/**
 * Validates a URL is a safe http/https URL. Throws a RenderError otherwise —
 * Slice 2 has no ValidationResult pipeline, so an unsafe URL is a hard
 * render failure, never a silent omission.
 */
export function sanitizeUrl(
  value: string,
  details: { blockId?: string; slotId?: string },
): string {
  const result = HttpUrlSchema.safeParse(value);
  if (!result.success) {
    throw new RenderError(
      "unsafe_asset_url",
      `URL is not a safe http or https address: ${value}`,
      details,
    );
  }
  return result.data;
}
