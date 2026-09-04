import { eq, inArray } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { db } from "@/db/client";
import { assets } from "@/db/schema";

import { RenderError } from "./render-error";
import { buildAssetUrlResolver } from "./resolve-asset-url";

const createdAssetIds: string[] = [];

afterEach(async () => {
  if (createdAssetIds.length > 0) {
    await db.delete(assets).where(inArray(assets.id, createdAssetIds));
    createdAssetIds.length = 0;
  }
});

async function insertTestAsset(storageKey: string) {
  const [row] = await db
    .insert(assets)
    .values({
      type: "campaign_image",
      filename: "test.png",
      mimeType: "image/png",
      sizeBytes: 100,
      storageKey,
    })
    .returning();
  createdAssetIds.push(row.id);
  return row;
}

describe("buildAssetUrlResolver", () => {
  it("resolves a real Asset id to its served URL", async () => {
    const asset = await insertTestAsset("resolver-test-key.png");

    const resolve = await buildAssetUrlResolver([asset.id]);

    // Resolved to an absolute URL — the renderer requires http/https, and
    // a relative path (the browser-facing form) has no origin to resolve
    // against inside a standalone rendered email.
    expect(resolve(asset.id)).toBe("http://localhost:3000/api/assets/resolver-test-key.png");
  });

  it("throws a typed unresolved_asset RenderError for a missing asset id", async () => {
    const resolve = await buildAssetUrlResolver([]);

    expect(() => resolve("nonexistent-id")).toThrow(RenderError);
    try {
      resolve("nonexistent-id");
    } catch (error) {
      expect((error as RenderError).code).toBe("unresolved_asset");
    }
  });

  it("resolves only the requested asset ids, ignoring unrelated rows", async () => {
    const asset = await insertTestAsset("resolver-test-key-2.png");
    const other = await db
      .select()
      .from(assets)
      .where(eq(assets.id, asset.id));
    expect(other).toHaveLength(1);

    const resolve = await buildAssetUrlResolver([asset.id]);
    expect(resolve(asset.id)).toBe(
      "http://localhost:3000/api/assets/resolver-test-key-2.png",
    );
  });
});
