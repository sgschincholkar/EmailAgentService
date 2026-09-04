import type {
  Asset,
  BrandProfile,
  Campaign,
  CampaignFacts,
  EmailBlock,
  EmailDocument,
  LayoutId,
  SegmentCard,
  SourceFact,
  ValidationResult,
} from "@/domain/schemas";

import type {
  assets,
  brandProfiles,
  campaigns,
  emailDocuments,
  segmentCards,
} from "./schema";

type BrandProfileRow = typeof brandProfiles.$inferSelect;
type CampaignRow = typeof campaigns.$inferSelect;
type SegmentCardRow = typeof segmentCards.$inferSelect;
type AssetRow = typeof assets.$inferSelect;
type EmailDocumentRow = typeof emailDocuments.$inferSelect;

export function assetRowToDomain(row: AssetRow): Asset {
  return {
    id: row.id,
    type: row.type as Asset["type"],
    filename: row.filename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    storageKey: row.storageKey,
    publicUrl: row.publicUrl ?? undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    altText: row.altText ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export function brandProfileRowToDomain(row: BrandProfileRow): BrandProfile {
  return {
    id: row.id,
    name: row.name,
    logoAssetId: row.logoAssetId ?? undefined,
    colors: {
      primary: row.colorsPrimary,
      secondary: row.colorsSecondary ?? undefined,
      accent: row.colorsAccent ?? undefined,
      background: row.colorsBackground ?? undefined,
      text: row.colorsText ?? undefined,
    },
    preferredFont: row.preferredFont ?? undefined,
    emailFontStack: row.emailFontStack,
    tone: row.tone,
    voiceNotes: row.voiceNotes ?? undefined,
    preferredTerms: row.preferredTerms,
    prohibitedTerms: row.prohibitedTerms,
    defaultCtaStyle: row.defaultCtaStyle as "filled" | "outline",
    defaultFooterHtml: row.defaultFooterHtml,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function segmentCardRowToDomain(row: SegmentCardRow): SegmentCard {
  return {
    id: row.id,
    name: row.name,
    lifecycleStage: (row.lifecycleStage ?? undefined) as SegmentCard["lifecycleStage"],
    primaryMotivation: row.primaryMotivation,
    primaryObjection: row.primaryObjection,
    desiredAction: row.desiredAction,
    messagingNotes: row.messagingNotes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function emailDocumentRowToDomain(row: EmailDocumentRow): EmailDocument {
  return {
    id: row.id,
    campaignId: row.campaignId,
    parentEmailDocumentId: row.parentEmailDocumentId ?? undefined,
    kind: row.kind as EmailDocument["kind"],
    version: row.version,
    layoutId: row.layoutId as LayoutId,
    subject: row.subject,
    preheader: row.preheader,
    blocks: row.blocks as EmailBlock[],
    sourceFacts: row.sourceFacts as SourceFact[],
    validationResults: row.validationResults as ValidationResult[],
    renderedHtml: row.renderedHtml ?? undefined,
    plainText: row.plainText ?? undefined,
    pdfAssetId: row.pdfAssetId ?? undefined,
    status: row.status as EmailDocument["status"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function campaignRowToDomain(row: CampaignRow): Campaign {
  return {
    id: row.id,
    brandProfileId: row.brandProfileId,
    segmentCardId: row.segmentCardId,
    name: row.name,
    campaignType: row.campaignType as Campaign["campaignType"],
    objective: row.objective as Campaign["objective"],
    brief: row.brief,
    facts: row.facts as CampaignFacts,
    selectedLayoutId: row.selectedLayoutId as LayoutId,
    assetIds: row.assetIds,
    status: row.status as Campaign["status"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
