# Email Agent Service — Architecture & Scope Decisions

Non-negotiable decisions governing V0 and V0.5. Changes require explicit product-owner approval.

---

## Architecture Decisions

### 1. No LLM-Generated HTML
The LLM generates structured JSON only (campaign angle, subject lines, block content). The application renders email HTML deterministically from fixed, hand-built, table-based templates. This ensures email-client compatibility, brand consistency, and security (no injected markup).

### 2. Structured EmailDocument Is Source of Truth
The system does not treat a raw HTML string as the canonical representation. `EmailDocument` is a structured, versionable document containing typed `EmailBlock` entries. HTML, plain text, and PDF are derived artifacts rendered from the EmailDocument + BrandProfile. This enables block-level editing, targeted regeneration, segment variants, and multi-format export without a rewrite.

### 3. Customer-Provided Images Only
Logo upload + 1–3 campaign images. No AI-generated, AI-replaced, AI-sourced, or stock images in V0/V0.5.

### 4. No ESP Integration in V0/V0.5
No Brevo, Klaviyo, Salesforce Marketing Cloud, HubSpot, Mailchimp, or any ESP. No draft publishing, audience management, recipient lists, consent/suppression, scheduling, or live sending. V0.5 adds individual test-email send only (manually entered test addresses).

### 5. Do Not Invent Campaign Facts
Dates, pricing, discounts, offers, product claims, feature names, eligibility, CTA labels, and URLs must come from explicit user-confirmed CampaignFacts fields. If required information is absent, the system warns the user. The LLM must never fabricate factual or commercial details.

### 6. Fixed Layout Library
Four layouts: Hero+CTA, Webinar/Event, Text-led Announcement, Promotion/Offer. User selects the layout. AI may recommend but must never silently switch. No arbitrary HTML import, visual template builder, drag-and-drop editor, or large template gallery.

### 7. Segment Cards, Not Tags
A segment is a structured card: name, lifecycle stage, primary motivation, primary objection, desired action, messaging notes. Not a free-text tag or simple dropdown.

### 8. Compact UX
Brand Profile → Campaign Setup → Generate → Preview/Export. Not an enterprise multi-step wizard.

---

## Data Model Decisions

### 9. Every EmailBlock Has a Stable ID
Blocks carry persistent IDs that survive edits, regeneration, and version snapshots. Required for targeted regeneration and future variant locking.

### 10. Campaign Facts Separate from AI Copy
`CampaignFacts` (confirmed data) and AI-generated persuasive content are distinct. The renderer and validator can independently verify factual claims.

### 11. Footer Blocks Are Non-Editable and Locked
Footer blocks have `editable: false` and `lockedForVariants: true`. System-owned content the user and the LLM cannot modify.

### 12. Assets Not Stored in Postgres
Asset binary data lives in pluggable storage adapter. Local filesystem adapter allowed only for local development. Cloudflare R2 or S3-compatible adapter required before any deployed/shareable environment. V0.5 uses same object storage for PDF/export artifacts. Postgres stores metadata and references only.

### 13. Validation Gates Export and Send
Error-level validation blocks HTML download, PDF export, and test-email send. Warning-level validation remains visible but does not block. Copy HTML is blocked only by rendering errors, schema errors, or safety errors — not by warnings. V0 prohibited terms default to warning severity. V0.5 supports configurable warning vs error severity per prohibited term.

---

## Scope Decisions

### 14. V0 Is a Demo/Pitch Tool
Single-user, no auth, no billing. Exists to validate the brand-kit-fidelity hypothesis.

### 15. V0.5 Is Lightweight Editing, Not a Full Editor
Block-level text editing and single-block regeneration. No drag-and-drop, no visual builder, no layout restructuring beyond switching among four layouts.

### 16. V1 Adds Segment Variants and ESP Draft Publishing
Brevo is the leading ESP candidate (draft-only, never auto-send). V1 is recorded in the design spec for future-proofing but has no implementation plan.

---

## Technology Decisions

### 17. Drizzle ORM with Hybrid Schema
Drizzle ORM with Postgres. Normalize top-level entities (BrandProfile, Campaign, SegmentCard, Asset, EmailDocument). Use validated JSONB for CampaignFacts, EmailBlocks, SourceFacts, ValidationResults, and model metadata. Do not over-normalize EmailBlock subtypes in V0/V0.5.

### 18. Resend for Test Email (V0.5)
Resend for explicit individual test-email sends. No lists, bulk, scheduling, audience management, or marketing sends. Prefix subjects with `[TEST]`. Record send status and message IDs. Block send if blocking validation errors exist.

### 19. PDF via Server-Side Browser Rendering (V0.5)
Prefer server-side browser rendering (Puppeteer/Playwright). Defer specific library choice to export slice. Do not duplicate email layout in a separate PDF library. Browser-print fallback acceptable for internal/demo use.

### 20. Vercel Deployment + Managed Postgres
Vercel for V0 and V0.5. Managed Postgres selected before external-pilot deployment (provider TBD — Neon, Supabase, or equivalent). No Railway, Render, or worker service until a real requirement emerges (server-side PDF needing long-running process, durable background jobs, etc.).

### 21. Wireframe Redesign Before Code (Slice 0)
V0 wireframes must be redesigned and annotated before implementation begins. V0.5 editor and V1 variant screens documented as future references only, not built in Slice 0.

---

## Process Decisions

### 22. V0 Persistence: No Version-History UI
V0 persists BrandProfile, Campaign, SegmentCard, Asset metadata, and generated EmailDocument (version 1). V0 has no user-facing version-history UI. V0.5 adds immutable version snapshots (new row per edit/regen/image-replace/layout-switch) and restore UI.

### 23. Progressive Disclosure in Campaign Setup
Campaign Setup shows core fields first (name, type, objective, brief, CTA, layout, images, segment). Conditional facts appear based on campaign type. Optional fields (dates, eligibility, claims) live in a collapsed advanced section. Do not turn V0 into a dense enterprise form.

### 24. Implementation Slice Order
Slice 0 (wireframes) → Slice 1A (app shell + shared schemas + Brand Profile) → Slice 1B (Postgres/Drizzle + Campaign Setup) → Slice 2 (EmailDocument + renderer + layouts with fixture data) → Slice 3 (asset upload/storage) → Slice 4 (Claude generation + validation) → Slice 5 (preview UI + export) → Slice 6 (evaluation + email client testing) → Slice 7 (V0.5 versioning + editing + regen) → Slice 8 (V0.5 export + test email + instrumentation).

### 25. Visual Direction Approved After Wireframe Review
The V0 product UI visual system will be approved after Slice 0 wireframe review. It must optimize for a calm, clear, trustworthy campaign-production workspace. Customer Brand Profile colors apply to generated email output, not dynamically to the application chrome. Existing Direction A (dark navy, amber, Source Serif 4 + Inter) is visual reference material only — it may be retained, adapted, or replaced after product-owner wireframe review.

### 26. Canonical Diagrams Are Binding Implementation References
Architecture and interaction diagrams in the canonical design specification are binding implementation references. Material changes require explicit product-owner approval.
