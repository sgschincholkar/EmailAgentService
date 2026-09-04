import { RenderError } from "../render-error";

/**
 * Deterministic fixture-only asset resolver. Maps fixture asset IDs to
 * project-owned local image files. Slice 2 has no storage adapter — Slice 3
 * supplies real asset URL resolution.
 */
const FIXTURE_ASSET_URLS: Record<string, string> = {
  "fixture-asset-hero": "http://localhost:3000/renderer-fixtures/hero.png",
  "fixture-asset-product": "http://localhost:3000/renderer-fixtures/product.png",
  "fixture-asset-logo": "http://localhost:3000/renderer-fixtures/logo.png",
};

export function resolveFixtureAssetUrl(assetId: string): string {
  const url = FIXTURE_ASSET_URLS[assetId];
  if (!url) {
    throw new RenderError(
      "unresolved_asset",
      `No fixture asset URL registered for "${assetId}".`,
      { blockId: assetId },
    );
  }
  return url;
}
