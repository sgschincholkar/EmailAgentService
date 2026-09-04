import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const brandProfiles = pgTable("brand_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  logoAssetId: uuid("logo_asset_id"),
  colorsPrimary: text("colors_primary").notNull(),
  colorsSecondary: text("colors_secondary"),
  colorsAccent: text("colors_accent"),
  colorsBackground: text("colors_background"),
  colorsText: text("colors_text"),
  preferredFont: text("preferred_font"),
  emailFontStack: text("email_font_stack").notNull(),
  tone: text("tone").array().notNull(),
  voiceNotes: text("voice_notes"),
  preferredTerms: text("preferred_terms").array().notNull().default([]),
  prohibitedTerms: text("prohibited_terms").array().notNull().default([]),
  defaultCtaStyle: text("default_cta_style").notNull(),
  defaultFooterHtml: text("default_footer_html").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const segmentCards = pgTable("segment_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  lifecycleStage: text("lifecycle_stage"),
  primaryMotivation: text("primary_motivation").notNull(),
  primaryObjection: text("primary_objection").notNull(),
  desiredAction: text("desired_action").notNull(),
  messagingNotes: text("messaging_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storageKey: text("storage_key").notNull(),
  publicUrl: text("public_url"),
  width: integer("width"),
  height: integer("height"),
  altText: text("alt_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandProfileId: uuid("brand_profile_id")
    .notNull()
    .references(() => brandProfiles.id),
  segmentCardId: uuid("segment_card_id")
    .notNull()
    .references(() => segmentCards.id),
  name: text("name").notNull(),
  campaignType: text("campaign_type").notNull(),
  objective: text("objective").notNull(),
  brief: text("brief").notNull(),
  facts: jsonb("facts").notNull(),
  selectedLayoutId: text("selected_layout_id").notNull(),
  assetIds: text("asset_ids").array().notNull().default([]),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emailDocuments = pgTable("email_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  parentEmailDocumentId: uuid("parent_email_document_id"),
  kind: text("kind").notNull(),
  version: integer("version").notNull(),
  layoutId: text("layout_id").notNull(),
  subject: text("subject").notNull(),
  preheader: text("preheader").notNull(),
  blocks: jsonb("blocks").notNull(),
  sourceFacts: jsonb("source_facts").notNull(),
  validationResults: jsonb("validation_results").notNull(),
  renderedHtml: text("rendered_html"),
  plainText: text("plain_text"),
  pdfAssetId: uuid("pdf_asset_id"),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
