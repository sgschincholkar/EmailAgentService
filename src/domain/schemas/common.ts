import { z } from "zod";

export const CampaignTypeSchema = z.enum([
  "announcement",
  "feature_launch",
  "webinar",
  "promotion",
  "newsletter",
  "activation",
  "reactivation",
]);

export const CampaignObjectiveSchema = z.enum([
  "clicks",
  "registrations",
  "purchase",
  "activation",
  "awareness",
]);

export const EmailStatusSchema = z.enum([
  "draft",
  "generating",
  "generated",
  "needs_review",
  "approved",
  "exported",
  "failed",
]);

export const EmailKindSchema = z.enum(["base", "segment_variant"]);

export const LayoutIdSchema = z.enum([
  "hero_cta",
  "webinar_event",
  "text_announcement",
  "promotion_offer",
]);

export const LifecycleStageSchema = z.enum([
  "prospect",
  "trial",
  "new_customer",
  "active_customer",
  "lapsed_customer",
  "vip",
]);

export const AssetTypeSchema = z.enum([
  "logo",
  "campaign_image",
  "reference_image",
  "export",
]);

export const ValidationSeveritySchema = z.enum(["info", "warning", "error"]);

export const ValidationCodeSchema = z.enum([
  "missing_cta",
  "invalid_cta_url",
  "missing_required_fact",
  "unsupported_claim",
  "prohibited_term",
  "missing_alt_text",
  "missing_footer",
  "unresolved_block",
  "template_render_error",
  "invalid_model_output",
  "unsafe_asset_url",
]);

export const NonEmptyStringSchema = z.string().trim().min(1);
export const TimestampSchema = z.iso.datetime();

export const HttpUrlSchema = z.url().refine(
  (value) => {
    try {
      const { protocol } = new URL(value);
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  },
  { message: "URL must use http or https." },
);

export type CampaignType = z.infer<typeof CampaignTypeSchema>;
export type CampaignObjective = z.infer<typeof CampaignObjectiveSchema>;
export type EmailStatus = z.infer<typeof EmailStatusSchema>;
export type EmailKind = z.infer<typeof EmailKindSchema>;
export type LayoutId = z.infer<typeof LayoutIdSchema>;
export type LifecycleStage = z.infer<typeof LifecycleStageSchema>;
export type AssetType = z.infer<typeof AssetTypeSchema>;
export type ValidationSeverity = z.infer<typeof ValidationSeveritySchema>;
export type ValidationCode = z.infer<typeof ValidationCodeSchema>;
