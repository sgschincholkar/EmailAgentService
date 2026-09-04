import { inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { assets } from "@/db/schema";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import { RenderError } from "./render-error";

const storage = new LocalStorageAdapter();

/**
 * LocalStorageAdapter.getUrl() returns a relative path (e.g.
 * /api/assets/xyz.png), which the browser resolves fine for UI thumbnails.
 * A standalone rendered email has no origin to resolve a relative path
 * against, and the renderer's sanitizeUrl requires an absolute http/https
 * URL — so this qualifies the path with a base URL before it reaches the
 * renderer. Defaults to localhost for local dev; APP_BASE_URL overrides it.
 */
function toAbsoluteUrl(relativeUrl: string): string {
  const baseUrl = process.env.APP_BASE_URL?.trim() || "http://localhost:3000";
  return new URL(relativeUrl, baseUrl).toString();
}

/**
 * Builds a synchronous assetId -> URL map for a set of asset IDs, for use
 * as the renderer's `resolveAssetUrl` callback. Resolution happens here,
 * outside `renderEmail`, so the renderer itself stays a pure, synchronous
 * function with no database or storage access of its own.
 */
export async function buildAssetUrlResolver(
  assetIds: string[],
): Promise<(assetId: string) => string> {
  const rows =
    assetIds.length === 0
      ? []
      : await db.select().from(assets).where(inArray(assets.id, assetIds));

  const urlByAssetId = new Map(
    rows.map((row) => [row.id, toAbsoluteUrl(storage.getUrl(row.storageKey))]),
  );

  return (assetId: string) => {
    const url = urlByAssetId.get(assetId);
    if (!url) {
      throw new RenderError(
        "unresolved_asset",
        `No asset found for id "${assetId}".`,
        { blockId: assetId },
      );
    }
    return url;
  };
}
