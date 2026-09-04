import { getBrandProfileById } from "@/app/brand-profiles/actions";
import { getCampaignById, listAssetsByIds } from "@/app/campaigns/actions";
import { db } from "@/db/client";
import { campaigns, emailDocuments } from "@/db/schema";
import type { EmailDocument } from "@/domain/schemas";
import { buildAssetUrlResolver } from "@/renderer/resolve-asset-url";
import { renderEmail } from "@/renderer/render-email";
import { eq } from "drizzle-orm";

import { buildEmailDocument } from "./build-email-document";
import { buildUserPrompt } from "./build-prompt";
import { GenerationValidationError, generateWithRetry } from "./generate-with-retry";
import { buildModelOutputSchema } from "./model-output-schema";
import { runPreflightCheck } from "./preflight-check";
import { runValidations } from "./run-validations";
import { SYSTEM_PROMPT } from "./system-prompt";

export class GenerationFailedError extends Error {}

/**
 * Full generation pipeline. An EmailDocument is only ever persisted, and
 * Campaign status only ever set to "generated", after a successful
 * deterministic render — model/schema/render failures leave no partial or
 * ambiguous EmailDocument row and set Campaign status to "failed".
 */
export async function generateCampaignEmail(campaignId: string): Promise<EmailDocument> {
  // 1. Load persisted BrandProfile, Campaign, CampaignFacts, SegmentCard, Assets.
  const campaignWithSegment = await getCampaignById(campaignId);
  if (!campaignWithSegment) {
    throw new GenerationFailedError("Campaign not found.");
  }
  const { segmentCard, ...campaign } = campaignWithSegment;

  const brandProfile = await getBrandProfileById(campaign.brandProfileId);
  if (!brandProfile) {
    throw new GenerationFailedError("Brand profile not found.");
  }

  const unorderedImages = await listAssetsByIds(campaign.assetIds);
  const images = campaign.assetIds
    .map((assetId) => unorderedImages.find((asset) => asset.id === assetId))
    .filter((asset) => asset !== undefined);

  // Preflight (CTA, required image) runs before any status change or
  // Claude call — a campaign that isn't ready to generate is not a failed
  // generation attempt, so status stays untouched here.
  runPreflightCheck({ campaign, hasImage: images.length > 0 });

  await db
    .update(campaigns)
    .set({ status: "generating", updatedAt: new Date() })
    .where(eq(campaigns.id, campaignId));

  try {
    // 2. Build prompt and call Claude. 3. Validate model structured output.
    const userPrompt = buildUserPrompt({ brandProfile, campaign, segmentCard, images });
    const outputSchema = buildModelOutputSchema(campaign.selectedLayoutId);
    const modelOutput = await generateWithRetry(SYSTEM_PROMPT, userPrompt, outputSchema);

    // 4. Build EmailDocument in memory.
    const document = buildEmailDocument({ campaign, brandProfile, images, modelOutput });

    // 5. Run pre-render validation.
    const validationResults = runValidations({
      campaign,
      brandProfile,
      document,
      modelOutput,
      hasImage: images.length > 0,
    });
    const documentWithValidation: EmailDocument = { ...document, validationResults };

    // 6. Run deterministic renderer.
    const resolveAssetUrl = await buildAssetUrlResolver(campaign.assetIds);
    const { html, plainText } = renderEmail(documentWithValidation, brandProfile, {
      resolveAssetUrl,
    });

    // 7. Only after successful render: persist + set status generated.
    const finalDocument: EmailDocument = {
      ...documentWithValidation,
      renderedHtml: html,
      plainText,
    };

    await db.insert(emailDocuments).values({
      id: finalDocument.id,
      campaignId: finalDocument.campaignId,
      kind: finalDocument.kind,
      version: finalDocument.version,
      layoutId: finalDocument.layoutId,
      subject: finalDocument.subject,
      preheader: finalDocument.preheader,
      blocks: finalDocument.blocks,
      sourceFacts: finalDocument.sourceFacts,
      validationResults: finalDocument.validationResults,
      renderedHtml: finalDocument.renderedHtml,
      plainText: finalDocument.plainText,
      status: finalDocument.status,
    });

    await db
      .update(campaigns)
      .set({ status: "generated", updatedAt: new Date() })
      .where(eq(campaigns.id, campaignId));

    return finalDocument;
  } catch (error) {
    await db
      .update(campaigns)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(campaigns.id, campaignId));

    if (error instanceof GenerationValidationError) {
      throw new GenerationFailedError(error.message);
    }
    if (process.env.GENERATION_DEBUG) {
      console.error("generateCampaignEmail pipeline error:", error);
    }
    throw new GenerationFailedError("Generation failed. Try again.");
  }
}
