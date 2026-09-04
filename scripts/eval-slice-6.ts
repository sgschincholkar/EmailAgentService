#!/usr/bin/env -S npx tsx
/**
 * Slice 6 evaluation runner. Creates the 3 eval Brand Profiles + fixture
 * assets, then for each of the 18 EVAL_COMBINATIONS creates a Campaign and
 * runs the real generation pipeline (real Claude API call — no mocking).
 * Every created row/file is recorded to a gitignored run manifest
 * (.eval-slice-6-run.json) as it's created, so an interrupted run can
 * still be torn down safely.
 *
 * Usage:
 *   npx tsx scripts/eval-slice-6.ts create      # build fixtures
 *   npx tsx scripts/eval-slice-6.ts generate     # run all 18 real generations
 *   npx tsx scripts/eval-slice-6.ts teardown     # delete everything in the manifest
 *   npx tsx scripts/eval-slice-6.ts create generate   # both, sequentially
 */
import { readFile, writeFile, readFile as readFileP } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

import { db } from "@/db/client";
import { assets, brandProfiles, campaigns, emailDocuments, segmentCards } from "@/db/schema";
import { inArray } from "drizzle-orm";

import { saveBrandProfile } from "@/app/brand-profiles/actions";
import { saveCampaign } from "@/app/campaigns/actions";
import { DEFAULT_EMAIL_FONT_STACK } from "@/domain/brand-profile-defaults";
import { generateCampaignEmail } from "@/generation/generate-campaign-email";
import { LocalStorageAdapter } from "@/storage/local-storage-adapter";
import { validateUpload } from "@/storage/validate-upload";

import { EVAL_BRANDS, EVAL_COMBINATIONS, EVAL_SEGMENTS } from "../fixtures/eval-slice-6-fixtures";

const MANIFEST_PATH = path.join(process.cwd(), ".eval-slice-6-run.json");
const FIXTURE_ASSETS_DIR = path.join(process.cwd(), "fixtures", "eval-assets");

type Manifest = {
  assetIds: string[];
  storageKeys: string[];
  brandProfileIds: string[];
  segmentCardIds: string[];
  campaignIds: string[];
  emailDocumentIds: string[];
  generations: Array<{
    combinationId: string;
    campaignId: string;
    status: "success" | "failed";
    emailDocumentId?: string;
    error?: string;
  }>;
};

function emptyManifest(): Manifest {
  return {
    assetIds: [],
    storageKeys: [],
    brandProfileIds: [],
    segmentCardIds: [],
    campaignIds: [],
    emailDocumentIds: [],
    generations: [],
  };
}

async function loadManifest(): Promise<Manifest> {
  if (!existsSync(MANIFEST_PATH)) return emptyManifest();
  const raw = await readFile(MANIFEST_PATH, "utf8");
  return JSON.parse(raw) as Manifest;
}

async function saveManifest(manifest: Manifest): Promise<void> {
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

const storage = new LocalStorageAdapter();

async function uploadFixtureAsset(
  manifest: Manifest,
  type: "logo" | "campaign_image",
  filename: string,
): Promise<string> {
  const filePath = path.join(FIXTURE_ASSETS_DIR, filename);
  const bytes = await readFileP(filePath);
  const validation = validateUpload(bytes, "image/png");
  if (!validation.ok) {
    throw new Error(`Fixture asset ${filename} failed validation: ${validation.error}`);
  }

  const storageKey = `eval-${crypto.randomUUID()}.png`;
  await storage.upload(bytes, storageKey, "image/png");
  manifest.storageKeys.push(storageKey);
  await saveManifest(manifest);

  const [row] = await db
    .insert(assets)
    .values({
      type,
      filename,
      mimeType: "image/png",
      sizeBytes: bytes.byteLength,
      storageKey,
      width: validation.width,
      height: validation.height,
      altText: type === "logo" ? undefined : `${filename.replace(/\.png$/, "").replace(/-/g, " ")}`,
    })
    .returning();
  manifest.assetIds.push(row.id);
  await saveManifest(manifest);

  return row.id;
}

async function createFixtures(): Promise<void> {
  const manifest = await loadManifest();

  console.log(`Creating ${EVAL_BRANDS.length} eval brand profiles...`);
  const brandProfileIdByKey = new Map<string, string>();
  const heroAssetIdByBrand = new Map<string, string>();

  for (const brand of EVAL_BRANDS) {
    const logoAssetId = await uploadFixtureAsset(manifest, "logo", brand.logoFixtureFile);
    const heroAssetId = await uploadFixtureAsset(manifest, "campaign_image", brand.heroFixtureFile);
    heroAssetIdByBrand.set(brand.key, heroAssetId);

    const profile = await saveBrandProfile({
      name: brand.name,
      logoAssetId,
      colors: brand.colors,
      emailFontStack: DEFAULT_EMAIL_FONT_STACK,
      tone: brand.tone,
      voiceNotes: brand.voiceNotes,
      preferredTerms: brand.preferredTerms,
      prohibitedTerms: brand.prohibitedTerms,
      defaultCtaStyle: brand.defaultCtaStyle,
      defaultFooterHtml: brand.defaultFooterHtml,
    });
    manifest.brandProfileIds.push(profile.id);
    await saveManifest(manifest);
    brandProfileIdByKey.set(brand.key, profile.id);
    console.log(`  Created brand profile: ${brand.name} (${profile.id})`);
  }

  console.log(`Creating ${EVAL_COMBINATIONS.length} eval campaigns...`);
  for (const combo of EVAL_COMBINATIONS) {
    const brandProfileId = brandProfileIdByKey.get(combo.brand);
    if (!brandProfileId) throw new Error(`Unknown brand key: ${combo.brand}`);
    const heroAssetId = heroAssetIdByBrand.get(combo.brand);
    if (!heroAssetId) throw new Error(`No hero asset for brand: ${combo.brand}`);

    const segment = EVAL_SEGMENTS[combo.segment];
    const needsImage = combo.campaign.selectedLayoutId === "hero_cta" ||
      combo.campaign.selectedLayoutId === "promotion_offer";

    const campaign = await saveCampaign({
      brandProfileId,
      ...combo.campaign,
      images: needsImage ? [{ assetId: heroAssetId }] : [],
      segmentCard: segment,
    });
    manifest.campaignIds.push(campaign.id);
    manifest.segmentCardIds.push(campaign.segmentCard.id);
    await saveManifest(manifest);
    console.log(`  Created campaign: ${combo.id} -> ${campaign.id}`);
  }

  console.log("Fixture creation complete.");
}

async function runGenerations(): Promise<void> {
  const manifest = await loadManifest();
  if (manifest.campaignIds.length === 0) {
    throw new Error("No campaigns in manifest. Run `create` first.");
  }

  // Re-derive combinationId -> campaignId order by re-reading campaigns in
  // creation order (manifest.campaignIds is already in EVAL_COMBINATIONS order).
  for (let i = 0; i < EVAL_COMBINATIONS.length; i++) {
    const combo = EVAL_COMBINATIONS[i];
    const campaignId = manifest.campaignIds[i];
    if (!campaignId) {
      console.error(`No campaign recorded for combination ${combo.id}, skipping.`);
      continue;
    }

    console.log(`Generating ${combo.id} (campaign ${campaignId})...`);
    try {
      const document = await generateCampaignEmail(campaignId);
      manifest.emailDocumentIds.push(document.id);
      manifest.generations.push({
        combinationId: combo.id,
        campaignId,
        status: "success",
        emailDocumentId: document.id,
      });
      console.log(`  OK — document ${document.id}, version ${document.version}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      manifest.generations.push({
        combinationId: combo.id,
        campaignId,
        status: "failed",
        error: message,
      });
      console.error(`  FAILED — ${message}`);
    }
    await saveManifest(manifest);
  }

  const successCount = manifest.generations.filter((g) => g.status === "success").length;
  console.log(`Generation complete: ${successCount}/${manifest.generations.length} succeeded.`);
}

async function teardown(): Promise<void> {
  const manifest = await loadManifest();

  if (manifest.emailDocumentIds.length > 0) {
    await db.delete(emailDocuments).where(inArray(emailDocuments.id, manifest.emailDocumentIds));
    console.log(`Deleted ${manifest.emailDocumentIds.length} email documents.`);
  }
  if (manifest.campaignIds.length > 0) {
    await db.delete(campaigns).where(inArray(campaigns.id, manifest.campaignIds));
    console.log(`Deleted ${manifest.campaignIds.length} campaigns.`);
  }
  if (manifest.segmentCardIds.length > 0) {
    await db.delete(segmentCards).where(inArray(segmentCards.id, manifest.segmentCardIds));
    console.log(`Deleted ${manifest.segmentCardIds.length} segment cards.`);
  }
  if (manifest.brandProfileIds.length > 0) {
    await db.delete(brandProfiles).where(inArray(brandProfiles.id, manifest.brandProfileIds));
    console.log(`Deleted ${manifest.brandProfileIds.length} brand profiles.`);
  }
  if (manifest.assetIds.length > 0) {
    await db.delete(assets).where(inArray(assets.id, manifest.assetIds));
    console.log(`Deleted ${manifest.assetIds.length} asset rows.`);
  }
  for (const storageKey of manifest.storageKeys) {
    await storage.delete(storageKey);
  }
  console.log(`Deleted ${manifest.storageKeys.length} storage files.`);

  if (existsSync(MANIFEST_PATH)) {
    await writeFile(MANIFEST_PATH, JSON.stringify(emptyManifest(), null, 2));
  }
  console.log("Teardown complete. Manifest reset.");
}

async function main() {
  const commands = process.argv.slice(2);
  if (commands.length === 0) {
    console.error("Usage: eval-slice-6.ts <create|generate|teardown> [...]");
    process.exit(1);
  }
  for (const command of commands) {
    if (command === "create") await createFixtures();
    else if (command === "generate") await runGenerations();
    else if (command === "teardown") await teardown();
    else {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
