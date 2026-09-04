CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"public_url" text,
	"width" integer,
	"height" integer,
	"alt_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo_asset_id" uuid,
	"colors_primary" text NOT NULL,
	"colors_secondary" text,
	"colors_accent" text,
	"colors_background" text,
	"colors_text" text,
	"preferred_font" text,
	"email_font_stack" text NOT NULL,
	"tone" text[] NOT NULL,
	"voice_notes" text,
	"preferred_terms" text[] DEFAULT '{}' NOT NULL,
	"prohibited_terms" text[] DEFAULT '{}' NOT NULL,
	"default_cta_style" text NOT NULL,
	"default_footer_html" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_profile_id" uuid NOT NULL,
	"segment_card_id" uuid NOT NULL,
	"name" text NOT NULL,
	"campaign_type" text NOT NULL,
	"objective" text NOT NULL,
	"brief" text NOT NULL,
	"facts" jsonb NOT NULL,
	"selected_layout_id" text NOT NULL,
	"asset_ids" text[] DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"parent_email_document_id" uuid,
	"kind" text NOT NULL,
	"version" integer NOT NULL,
	"layout_id" text NOT NULL,
	"subject" text NOT NULL,
	"preheader" text NOT NULL,
	"blocks" jsonb NOT NULL,
	"source_facts" jsonb NOT NULL,
	"validation_results" jsonb NOT NULL,
	"rendered_html" text,
	"plain_text" text,
	"pdf_asset_id" uuid,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segment_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"lifecycle_stage" text,
	"primary_motivation" text NOT NULL,
	"primary_objection" text NOT NULL,
	"desired_action" text NOT NULL,
	"messaging_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_brand_profile_id_brand_profiles_id_fk" FOREIGN KEY ("brand_profile_id") REFERENCES "public"."brand_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_segment_card_id_segment_cards_id_fk" FOREIGN KEY ("segment_card_id") REFERENCES "public"."segment_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_documents" ADD CONSTRAINT "email_documents_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;