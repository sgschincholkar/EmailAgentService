# Email Agent Service — V0 / V0.5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone AI email agent that turns a campaign brief + brand kit into an on-brand, editable, responsive email campaign draft — no designer required.

**Architecture:** Next.js full-stack app (App Router) with Drizzle ORM + Postgres hybrid schema (normalized tables + validated JSONB). Claude Sonnet generates structured JSON only; a deterministic renderer produces table-based HTML from four fixed layouts. Asset storage uses a pluggable adapter (local filesystem dev, R2/S3 before deploy).

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS, Drizzle ORM, Postgres, Zod, Anthropic SDK (Claude Sonnet), Resend (V0.5), Vercel

**Spec:** `docs/superpowers/specs/2026-09-01-email-agent-v0-design.md`

**Decisions:** `docs/email-agent-decisions.md` (26 non-negotiable decisions)

## Architecture and Interaction References

| Reference | Exact section in the canonical design spec | What it governs during implementation |
|---|---|---|
| Product interaction flow | [`## Product Interaction Flow`](superpowers/specs/2026-09-01-email-agent-v0-design.md#product-interaction-flow) | The allowed user journey and action set in V0, V0.5, and Future V1; validation gates; and the prohibition on ESP integration or live/bulk marketing sends in V0/V0.5. |
| V0 generation sequence | [`## V0 Generation Sequence`](superpowers/specs/2026-09-01-email-agent-v0-design.md#v0-generation-sequence) | Server-side generation orchestration, bounded schema-repair retry, recoverable failure behavior, creation of EmailDocument version 1, validation, deterministic rendering, persistence, and preview results. |
| System architecture/container diagram | [`## System Architecture and Container View`](superpowers/specs/2026-09-01-email-agent-v0-design.md#system-architecture-and-container-view) | Application container boundaries, service responsibilities, database and asset-storage boundaries, derived artifacts, and the version-specific limits on Resend and Brevo. |
| Data lifecycle diagram | [`## Data Model` → `### Data Lifecycle`](superpowers/specs/2026-09-01-email-agent-v0-design.md#data-lifecycle) | The canonical EmailDocument representation, relationships among stored inputs, immutable V0.5 snapshots, derived outputs, asset binaries outside Postgres, and the future-only parent link for a V1 segment variant. |

Implementation must not introduce a data flow, component, integration, or scope item that conflicts with the canonical diagrams, design specification, or architecture decisions without explicit product-owner approval.

## Global Constraints

- No LLM-generated HTML — Claude returns structured JSON only; renderer produces HTML deterministically
- EmailDocument is the canonical source of truth — HTML/plain-text/PDF are derived artifacts
- Customer-provided images only — no AI-generated, stock, or scraped images
- No ESP integration in V0/V0.5 — V0.5 adds individual test-email send only (Resend)
- CampaignFacts are the sole source of factual claims — LLM must never invent dates, prices, offers, URLs
- Four fixed layouts only: `hero_cta`, `webinar_event`, `text_announcement`, `promotion_offer`
- Segment Cards are structured (name, lifecycle stage, motivation, objection, desired action, messaging notes) — not tags or dropdowns
- Drizzle ORM with hybrid schema — normalized tables for top-level entities, validated JSONB for nested structures
- Asset binary data never stored in Postgres — pluggable storage adapter; local filesystem for dev only, R2/S3 before deploy
- Error-level validation blocks export/send; warning-level visible but non-blocking; Copy HTML blocked only by render/schema/safety errors
- V0 persists EmailDocument at version 1 with no version-history UI; V0.5 adds immutable snapshots + restore
- Progressive disclosure in Campaign Setup — core fields visible, conditional facts by type, advanced section collapsed
- Visual direction not yet final — existing Direction A is reference material only; approved after Slice 0 wireframe review (Decision 25)
- Customer Brand Profile colors apply to generated email output, not to application chrome
- File paths in this plan are implementation guidance, not fixed contracts — exact paths follow repository conventions established in Slice 1A; separation of concerns (schemas, storage, renderer, templates, generation, validation, versioning, UI components) is required

## Repository Assessment

**Current state:** Completely greenfield. No application code exists.

| What exists | Path | Notes |
|---|---|---|
| Design spec | `docs/superpowers/specs/2026-09-01-email-agent-v0-design.md` | Canonical spec |
| Decisions doc | `docs/email-agent-decisions.md` | 26 non-negotiable decisions |
| This plan | `docs/email-agent-v0-v0.5-implementation-plan.md` | You are reading it |
| V0 wireframe prototype | `design/v0-ui/Main.dc.html` | 3-step clickable prototype — visual reference only, not final |
| Direction explorations | `design/v0-ui/DirectionA/B/C.dc.html` | Direction A is reference material, not confirmed |
| Canvas config | `design/v0-ui/canvas.json` | Single artboard layout |

**What does NOT exist:** `package.json`, `tsconfig.json`, `next.config.*`, `drizzle.config.*`, `docker-compose.yml`, any `src/` directory, any `node_modules/`, any `.env`, any test files, any CI config. Every slice starts from zero infrastructure.

**Wireframe reusability:** `Main.dc.html` uses Claude Design `.dc.html` format with `DCLogic` class — not React components. Direction A (dark navy, amber, Source Serif 4 + Inter) is visual reference material only — the final V0 visual system is approved after Slice 0 wireframe review (Decision 25). Field inventory is incomplete vs spec (see Wireframe Alignment section in design spec). Slice 0 redesigns wireframes from scratch.

## Slice Numbering

| Slice | Scope | Milestone |
|---|---|---|
| 0 | Wireframe Redesign + Product-State Annotations | — |
| 1A | App Shell + Shared Domain Schemas + Brand Profile Flow | — |
| 1B | Postgres/Drizzle Persistence + Campaign Setup Flow | — |
| 2 | Structured EmailDocument + Deterministic Renderer + Four Layouts | — |
| 3 | Asset Upload + Storage Abstraction + Image Rendering | — |
| 4 | Claude Structured Generation + Schema Validation | — |
| 5 | Preview UI + Validation Panel + Copy/Download HTML | V0 feature-complete |
| 6 | Evaluation Fixtures + Gmail/Outlook Manual Testing | V0 quality gate |
| 7 | Versioned Persistence + Block Editing + Targeted Regeneration + Layout Switch | — |
| 8 | Plain-Text/PDF Export + Resend Test Email + Instrumentation | V0.5 complete |

---

## Slice 0: Wireframe Redesign + Product-State Annotations

### 1. Objective

Produce complete V0 wireframes covering every spec screen, field, and user-facing state — annotated with data-entity mappings and interaction behaviors — before any application code is written.

### 2. Sequencing Rationale

Wireframes must come first (Decision 21). Current wireframes are incomplete: Brand Profile missing most fields, Campaign Setup missing progressive disclosure and campaign facts, Segment Card is a dropdown not a structured form, Preview missing validation panel and mobile toggle. Building on incomplete wireframes means rework. This slice produces the visual contract that all subsequent slices implement against.

### 3. Included Functionality

- **Brand Profile screen:** All spec fields — brand name, logo upload area, primary/secondary/accent/background/text color hex inputs with preview swatches, preferred font input, tone/voice presets, free-text voice notes, preferred terms list, prohibited terms list, default CTA style toggle (filled/outline), default footer content textarea
- **Campaign Setup screen with progressive disclosure:**
  - Core section (always visible): campaign name, campaign type selector, campaign objective selector, campaign brief textarea, CTA label input, CTA URL input, layout selector (4 fixed layouts with visual thumbnails), image upload (1–3 campaign images), Segment Card inline form
  - Conditional facts section (shown based on campaign type): product/feature name, offer/discount/price text, event date/time, speaker
  - Advanced section (collapsed by default): start/end dates, eligibility/terms, required claims/proof points, additional confirmed facts
- **Segment Card inline form:** name, lifecycle stage dropdown, primary motivation, primary objection, desired action, messaging notes
- **Generate/Loading/Error states:** generating spinner with status text, error message with retry button, timeout handling annotation
- **Preview & Export screen:** desktop preview (iframe), mobile preview (narrow iframe), desktop/mobile toggle, subject line + preheader display, campaign angle (collapsed section), validation panel (errors/warnings/info grouped by severity), Copy HTML button, Download HTML button. Preview is a visual browser rendering only — not a Gmail, Outlook, or deliverability simulation. UI copy must not claim "inbox-ready," "Gmail verified," or "Outlook verified" before manual verification in Slice 6.
- **Empty state:** no campaigns yet — prompt to create first campaign
- **Form validation error states:** inline field-level errors, form-level error summary
- **Annotations on every screen:** which fields map to which data entities, which states are required, which interactions trigger which actions, which fields are required vs optional

### 4. Non-Goals

- No V0.5 editor wireframes (document as future reference text annotation only)
- No V1 variant wireframes (document as future reference text annotation only)
- No application code, no `package.json`, no project init
- No final visual system lock-in — wireframes demonstrate layout, hierarchy, and states; visual polish and final direction approved after review (Decision 25)
- No interactive prototype logic beyond what Claude Design `.dc.html` supports for demonstrating flow
- No user testing or external feedback collection

### 5. User-Visible Behavior

Not applicable — Slice 0 produces design artifacts, not running software. Output is wireframe files viewable in Claude Design canvas and a Markdown annotations document.

### 6. Domain Entities Involved

All V0 entities referenced in annotations:
- **BrandProfile** — fields mapped to Brand Profile screen inputs
- **Campaign** — fields mapped to Campaign Setup core section
- **CampaignFacts** — fields mapped to conditional + advanced sections
- **SegmentCard** — fields mapped to inline Segment Card form
- **Asset** — logo upload and campaign image upload areas annotated with Asset metadata
- **EmailDocument** — preview screen annotated with EmailDocument fields (subject, preheader, blocks, validationResults)
- **ValidationResult** — validation panel annotated with severity levels and blocking behavior

### 7. Routes, Pages, and Components

Not applicable — no application code in this slice. Wireframe files:

Likely files (exact names may change during wireframe authoring):
- `design/v0-ui/` — updated wireframes (new .dc.html files or updated Main.dc.html)
- `design/v0-ui/canvas.json` — updated multi-artboard layout
- `docs/wireframe-annotations.md` — field-to-entity mapping and state inventory

### 8. Server Routes and Services

Not applicable — no server code in this slice.

### 9. Persistence and Storage

Not applicable — no database in this slice. Annotations document which fields persist to which entities and which use JSONB vs normalized columns.

### 10. LLM Behavior

Not applicable — no LLM integration in this slice. Annotations document where generation triggers, what inputs flow to the LLM, and what outputs appear in the UI.

### 11. Renderer Behavior

Not applicable — no renderer in this slice. Preview wireframe annotated with "rendered HTML displayed in sandboxed iframe — visual browser preview only, not an email-client simulation" and layout slot labels matching the four fixed layouts.

### 12. Automated Tests

Not applicable — no code to test.

### 13. Manual Acceptance Test

| # | Check | Pass criteria |
|---|---|---|
| 1 | Every Brand Profile spec field appears in wireframe | Compare spec table (Section V0.2) against wireframe — zero missing fields |
| 2 | Campaign Setup shows progressive disclosure | Core fields visible by default; conditional facts appear on type change; advanced section collapsed |
| 3 | Segment Card is a structured form | Name, lifecycle stage, motivation, objection, desired action, messaging notes — not a dropdown |
| 4 | Layout selector shows 4 options | `hero_cta`, `webinar_event`, `text_announcement`, `promotion_offer` with visual thumbnails |
| 5 | Preview screen has all elements | Desktop/mobile toggle, subject, preheader, campaign angle, validation panel, Copy HTML, Download HTML |
| 6 | Preview clearly separated from email output | App UI chrome is distinct from customer-branded email content in the preview iframe |
| 7 | All user-facing states represented | Empty, loading/generating, error + retry, success (preview), form validation errors |
| 8 | No wireframe implies out-of-scope features | No drag-and-drop, no ESP, no variant generation, no WYSIWYG editor, no auth |
| 9 | Annotations complete | Every screen annotated with entity mappings, required states, interaction triggers |
| 10 | Clear hierarchy for compact, form-heavy, validation-aware workflow | Information density appropriate — not a dense enterprise form, not an oversimplified wizard |
| 11 | No inbox-readiness claims | Preview screen does not label output as "Gmail verified," "Outlook verified," or "inbox-ready" |

### 14. Risks, Dependencies, and Stop-Conditions

| Risk | Mitigation |
|---|---|
| Wireframe tool availability | Claude Design `.dc.html` format confirmed available. Fallback: annotated static HTML if canvas unavailable. |
| Scope creep into V0.5 screens | Non-goals explicitly exclude V0.5/V1 wireframes. Annotate as "future reference" text only. |
| Progressive disclosure complexity in static wireframe | Show two states of Campaign Setup: default (core only) and expanded (conditional + advanced visible). Annotate toggle behavior. |
| Visual direction lock-in | Wireframes show layout and hierarchy; final visual system (palette, typography, density) approved by product owner after review (Decision 25). |

**Stop-condition:** If wireframe format cannot represent progressive disclosure states, document behavior in annotations and proceed with static layouts showing both states side by side.

### 15. Completion Gate

- [ ] All V0 spec fields present in wireframes (zero omissions against spec tables)
- [ ] All user-facing states (empty, loading, error, success, retry, form validation) represented
- [ ] Layout selector shows 4 fixed layouts
- [ ] Campaign facts fields conditional on campaign type
- [ ] Segment Card is structured form, not dropdown
- [ ] Validation panel visible in preview screen with error/warning/info grouping
- [ ] `docs/wireframe-annotations.md` complete with entity mappings and state inventory
- [ ] No wireframe implies features excluded from V0 scope
- [ ] Wireframes demonstrate clear hierarchy for compact, form-heavy, validation-aware campaign workflow
- [ ] App UI chrome is visually separated from customer-branded email output
- [ ] No specific palette, typography, or visual system mandated — visual direction approved after product-owner review

---

## Slice 1A: App Shell + Shared Domain Schemas + Brand Profile Flow

### 1. Objective

Standing Next.js app with TypeScript, styling foundation, shared domain types and Zod schemas, basic navigation, and a working Brand Profile form with client-side validation. No database, no API routes — local state or fixture persistence only.

### 2. Sequencing Rationale

Splitting the original Slice 1 so the app shell and schemas can be validated independently before adding database complexity. Brand Profile is the first entity users interact with and has the most fields — getting the form right first de-risks Campaign Setup. Shared Zod schemas established here are reused by every subsequent slice.

### 3. Included Functionality

- **Project initialization:** Next.js (App Router), TypeScript, Tailwind CSS, ESLint, project structure conventions
- **Styling foundation:** Tailwind config with design tokens matching approved wireframe direction. If visual direction not yet approved, use neutral defaults that match the "calm, clear, trustworthy" requirement (Decision 25).
- **Shared domain types and Zod schemas:** TypeScript types and Zod validators for all entities — BrandProfile, Campaign, CampaignFacts, SegmentCard, Asset, EmailDocument, EmailBlock (all subtypes), SourceFact, ValidationResult. These are the source of truth for validation throughout the app.
- **Basic navigation:** Root layout, nav bar, brand profiles list page, create brand profile page
- **Brand Profile form:** All spec fields — name, logo placeholder (upload wired in Slice 3), color hex inputs with preview, font input, tone presets, voice notes, preferred/prohibited terms, CTA style, footer content. Client-side Zod validation on submit.
- **Local fixture/state persistence:** Brand Profile data persisted via local state, localStorage, or in-memory store. Enough to survive page navigation within a session. Does not require Postgres.

### 4. Non-Goals

- No Postgres, no Docker, no Drizzle ORM (Slice 1B)
- No API routes (Slice 1B)
- No Campaign Setup, CampaignFacts, or SegmentCard forms (Slice 1B)
- No image upload (Slice 3)
- No generation, rendering, or preview
- No deployment

### 5. User-Visible Behavior

- User opens app at `localhost:3000`, sees brand profiles list (or empty state prompting creation)
- User creates Brand Profile: fills all spec fields, submits, data persists within session
- Form validation: required fields enforced (name, primary color, at least one tone preset), hex color format validated, CTA URL format validated
- Color hex inputs show swatch previews
- Preferred/prohibited terms managed as editable lists

### 6. Domain Entities Involved

| Entity | Role in this slice |
|---|---|
| BrandProfile | Full Zod schema created; form built; local persistence |
| Campaign | Zod schema created (no form yet) |
| CampaignFacts | Zod schema created (no form yet) |
| SegmentCard | Zod schema created (no form yet) |
| Asset | Zod schema created (no upload yet) |
| EmailDocument | Zod schema created (no generation yet) |
| EmailBlock (all subtypes) | Zod schemas created |
| SourceFact | Zod schema created |
| ValidationResult | Zod schema created |

### 7. Routes, Pages, and Components

Likely module/component responsibilities; exact paths follow repository conventions established during this slice:

- Root layout with navigation
- Brand profiles list page
- Create/edit brand profile page
- Brand profile form component (all spec fields)
- Color hex input with swatch preview component
- Preferred/prohibited terms list input component
- Empty state component

### 8. Server Routes and Services

Likely module responsibilities; exact paths follow repository conventions established during this slice:

- Shared Zod schemas module (all domain entities)
- Shared TypeScript type definitions module

No API routes in this slice — form submissions use local state.

### 9. Persistence and Storage

No database. Brand Profile data held in client-side state (React state, localStorage, or equivalent). Enough for form development and validation testing. Real persistence in Slice 1B.

### 10. LLM Behavior

Not applicable.

### 11. Renderer Behavior

Not applicable.

### 12. Automated Tests

Likely test module responsibilities; exact paths follow repository conventions established during this slice:

| Test area | What it covers |
|---|---|
| BrandProfile Zod schema | Validates correct shape; rejects missing required fields (name, colors.primary, tone); rejects invalid hex colors; accepts optional fields as undefined |
| Campaign Zod schema | Validates Campaign + CampaignFacts; rejects missing required facts (ctaLabel, ctaUrl); validates URL format on ctaUrl |
| SegmentCard Zod schema | Validates shape; rejects missing required fields (name, motivation, objection, desiredAction) |
| EmailDocument Zod schema | Validates full structure; validates each EmailBlock union type; validates ValidationResult and SourceFact shapes |
| Brand Profile form | Required fields enforced; hex color validation; form submits valid data |

### 13. Manual Acceptance Test

| # | Check | Pass criteria |
|---|---|---|
| 1 | `npm run dev` starts app | No errors, page loads at localhost:3000 |
| 2 | Brand Profile form renders all fields | Every field from spec table V0.2 visible |
| 3 | Form validation works | Submit empty form — see inline errors on name, primary color, tone |
| 4 | Hex color input | Enter "#2563EB" — swatch preview shows blue. Enter "notacolor" — validation error. |
| 5 | Terms list | Add "workspace" to preferred terms, remove it — list updates correctly |
| 6 | Data persists within session | Create profile, navigate away, navigate back — data still present |
| 7 | Empty state | No profiles — list page shows prompt to create first |

### 14. Risks, Dependencies, and Stop-Conditions

| Risk | Mitigation |
|---|---|
| Visual direction not yet approved | Use neutral Tailwind defaults. Design tokens easily swapped after wireframe review. |
| Zod schema complexity for JSONB shapes | Build incrementally — validate simple shapes first, add nested structures. Test each schema independently. |
| Local state persistence limitations | localStorage sufficient for dev. If complex state needed, use Zustand or similar. Don't over-engineer — real persistence comes in Slice 1B. |

**Stop-condition:** If Zod schemas cannot validate the TypeScript reference model shapes correctly (e.g., union types break), resolve schema design before proceeding. Schemas are shared across all slices.

**Dependency:** Slice 0 complete (wireframes guide form layout).

### 15. Completion Gate

- [ ] `npm run dev` starts Next.js app without errors
- [ ] All domain entity Zod schemas pass validation tests
- [ ] Brand Profile form renders all spec fields with client-side validation
- [ ] Color hex inputs show swatch previews
- [ ] Preferred/prohibited terms work as editable lists
- [ ] Basic navigation between list and form pages works
- [ ] Empty state displays when no profiles exist
- [ ] Repository conventions established (folder structure, naming, module boundaries)

---

## Slice 1B: Postgres/Drizzle Persistence + Campaign Setup Flow

### 1. Objective

Local Postgres via Docker, Drizzle ORM with full schema migration, server-side persistence for Brand Profile, and working Campaign Setup form with progressive disclosure, Segment Card inline form, and layout selector — all persisting to the database.

### 2. Sequencing Rationale

Database persistence is separated from the app shell (Slice 1A) so schema/form issues surface independently from infrastructure issues. Campaign Setup depends on BrandProfile existing (FK relationship). Segment Card is created inline with Campaign. Both must persist before renderer (Slice 2) or generation (Slice 4) can operate.

### 3. Included Functionality

- **Docker Compose for local Postgres** (Postgres 16, volume-mounted)
- **Drizzle ORM configuration:** `drizzle.config.ts`, database client module
- **Full database migration:** All tables — `brand_profiles`, `campaigns`, `segment_cards`, `assets`, `email_documents`
  - Normalized columns for top-level fields
  - JSONB columns: `campaigns.facts`, `email_documents.blocks`, `email_documents.source_facts`, `email_documents.validation_results`
  - Foreign keys: Campaign → BrandProfile, Campaign → SegmentCard, EmailDocument → Campaign
- **Brand Profile persistence:** Migrate from local state (Slice 1A) to API routes + Postgres. CRUD operations.
- **Campaign Setup form with progressive disclosure:**
  - Core section: name, type selector, objective selector, brief textarea, CTA label, CTA URL, layout selector (4 options), segment card (inline)
  - Conditional facts: fields shown/hidden based on selected campaign type
  - Advanced section: collapsed by default, toggle to expand
- **Segment Card inline form:** All fields — name, lifecycle stage, motivation, objection, desired action, messaging notes. Created/edited inline within Campaign Setup.
- **Layout selector:** Four layout options with labels
- **Seed data:** One demo Brand Profile + one demo Segment Card loaded on first run
- **List views:** Campaigns list with status badges, brand profiles list

### 4. Non-Goals

- No image upload (Slice 3)
- No generation, rendering, or preview
- No deployment — local development only
- No auth, no multi-tenancy
- No version history (V0.5 — Slice 7)

### 5. User-Visible Behavior

- Brand Profile now persists to Postgres (survives app restart)
- User creates Campaign: sees progressive disclosure form — core fields visible, conditional facts appear when campaign type selected, advanced section expandable
- User fills Segment Card inline within Campaign Setup
- User selects layout from 4 options
- All form data persists to Postgres and survives page refresh / app restart
- Form validation: required fields enforced, URL format validated for CTA URL, hex color format validated
- Campaigns list shows all campaigns with status badges
- Seed data available on first run

### 6. Domain Entities Involved

| Entity | Table | Schema type | Key JSONB columns |
|---|---|---|---|
| BrandProfile | `brand_profiles` | Normalized | None (all columns) |
| Campaign | `campaigns` | Normalized + JSONB | `facts` (CampaignFacts) |
| CampaignFacts | — | JSONB within Campaign | — |
| SegmentCard | `segment_cards` | Normalized | None |
| Asset | `assets` | Normalized | None (schema only, no upload logic yet) |
| EmailDocument | `email_documents` | Normalized + JSONB | `blocks`, `source_facts`, `validation_results` |

### 7. Routes, Pages, and Components

Likely module/component responsibilities; exact paths follow repository conventions established in Slice 1A:

- Campaign setup page (create)
- Campaign list page
- Campaign form component (progressive disclosure)
- Segment card inline form component
- Layout selector component
- Update brand profile pages to use API routes + Postgres instead of local state

### 8. Server Routes and Services

Likely module/component responsibilities; exact paths follow repository conventions established in Slice 1A:

- Brand Profile API routes (POST create, GET read, PUT update)
- Campaign API routes (POST create, GET read)
- Segment Card API routes (POST create, GET read, PUT update)
- Drizzle client initialization module
- Drizzle schema definition module (all tables)
- Seed data script

### 9. Persistence and Storage

| Table | Key columns | Notes |
|---|---|---|
| `brand_profiles` | id (uuid), name, logo_asset_id (nullable FK), colors_primary, colors_secondary, colors_accent, colors_background, colors_text, preferred_font, email_font_stack, tone (text[]), voice_notes, preferred_terms (text[]), prohibited_terms (text[]), default_cta_style, default_footer_html, created_at, updated_at | All normalized columns. |
| `campaigns` | id (uuid), brand_profile_id (FK), segment_card_id (FK), name, campaign_type, objective, brief, facts (jsonb), selected_layout_id, asset_ids (text[]), status, created_at, updated_at | `facts` validated by CampaignFacts Zod schema. |
| `segment_cards` | id (uuid), name, lifecycle_stage, primary_motivation, primary_objection, desired_action, messaging_notes, created_at, updated_at | All normalized. |
| `assets` | id (uuid), type, filename, mime_type, size_bytes, storage_key, public_url, width, height, alt_text, created_at | Schema created; upload logic in Slice 3. |
| `email_documents` | id (uuid), campaign_id (FK), parent_email_document_id (nullable FK), kind, version (int), layout_id, subject, preheader, blocks (jsonb), source_facts (jsonb), validation_results (jsonb), rendered_html, plain_text, pdf_asset_id, status, created_at, updated_at | Schema created; populated by generation in Slice 4. |

**Migration:** Initial migration creates all tables. Run via `drizzle-kit push` for local dev.

**Docker Compose:** Postgres 16 on port 5432, volume-mounted for data persistence across restarts.

### 10. LLM Behavior

Not applicable.

### 11. Renderer Behavior

Not applicable.

### 12. Automated Tests

Likely test module responsibilities; exact paths follow repository conventions established in Slice 1A:

| Test area | What it covers |
|---|---|
| Database migration | Migration runs without error; all tables exist; JSONB columns accept valid shapes |
| Brand Profile CRUD | POST creates record; GET retrieves; PUT updates; missing required fields return 400 |
| Campaign CRUD | POST creates with facts and segment reference; GET retrieves with expanded facts; conditional facts persist correctly per campaign type |
| Segment Card CRUD | POST creates; GET retrieves; PUT updates |
| JSONB roundtrip | CampaignFacts Zod schema validates before insert; data roundtrips correctly through Postgres JSONB |
| Layout selection | Selection persists on Campaign record |

### 13. Manual Acceptance Test

| # | Check | Pass criteria |
|---|---|---|
| 1 | Docker Postgres starts | `docker compose up` — Postgres available on port 5432 |
| 2 | Migration runs | Drizzle migration creates all tables without error |
| 3 | Brand Profile persists | Create profile, restart app, data intact |
| 4 | Campaign Setup progressive disclosure | Core fields visible; select "webinar" — event fields appear; select "promotion" — offer fields appear; toggle advanced section |
| 5 | Segment Card works inline | Fill segment card within campaign setup; saves with campaign |
| 6 | Layout selector shows 4 options | Selectable, selection persists |
| 7 | Seed data loads | First run: demo brand profile and segment card available |
| 8 | Campaigns list shows status | List page with status badges |

### 14. Risks, Dependencies, and Stop-Conditions

| Risk | Mitigation |
|---|---|
| Docker not installed on dev machine | Document Docker install requirement in README. Fallback: direct Postgres install. |
| Drizzle JSONB validation approach unclear | Validate at application layer with Zod before insert; Drizzle stores as untyped jsonb. Test roundtrip in migration test. |
| Progressive disclosure UX complexity | Client-side state only: show/hide sections based on campaign type and advanced toggle. No server logic for disclosure. |

**Stop-condition:** If Drizzle JSONB roundtrip fails (data corruption on read), switch to normalized columns for CampaignFacts before proceeding. Do not ship broken JSONB persistence.

**Dependency:** Slice 1A complete (app shell, schemas, Brand Profile form exist).

### 15. Completion Gate

- [ ] `docker compose up` starts Postgres; Drizzle migration creates all tables
- [ ] Brand Profile persists to Postgres via API routes (survives restart)
- [ ] Campaign Setup form renders with progressive disclosure (core → conditional → advanced)
- [ ] Segment Card form works inline within Campaign Setup, persists correctly
- [ ] Layout selector shows 4 options, selection persists on Campaign
- [ ] CampaignFacts JSONB column validates against Zod schema and roundtrips correctly
- [ ] Seed data loads on first run
- [ ] All API route and CRUD tests pass
- [ ] Campaigns list page shows campaigns with status badges

---

## Slice 2: Structured EmailDocument + Deterministic Renderer + Four Layouts

### 1. Objective

Given fixture EmailDocument data (hardcoded JSON matching the model output schema), the renderer produces valid table-based HTML and plain text for all four layouts. No Claude integration — fixtures only.

### 2. Sequencing Rationale

Renderer comes before Claude integration (Slice 4) so templates can be tested and iterated with predictable fixture data. This isolates template quality from model variability. If templates look wrong, we fix them before adding AI. Renderer also comes before asset upload (Slice 3 in parallel is possible, but Slice 2 uses local fixture image assets) so we can validate HTML structure independently.

### 3. Included Functionality

- **Fixture EmailDocuments:** One per layout, matching the LLM output schema exactly — hardcoded JSON with realistic content for a demo brand
- **Project-owned fixture image assets:** Small sample images (logo, hero, product) stored in the repository under a fixtures directory, served locally for renderer and manual browser tests. Third-party placeholder services (placehold.co, etc.) may appear only as mocked URL strings in automated test assertions — not in manual browser or email-client rendering.
- **Four hand-built HTML email templates:**
  - `hero_cta`: hero image, headline, body text, CTA button, footer
  - `webinar_event`: headline, event details block, body text, CTA button, footer
  - `text_announcement`: headline, body text, CTA button, footer
  - `promotion_offer`: hero image, headline, offer details block, body text, CTA button, footer
- **Rendering engine:** Pure function — takes EmailDocument + BrandProfile, returns `{ html: string, plainText: string }`
  - Selects template by `layoutId`
  - Fills template slots from EmailDocument blocks (matched by slot ID)
  - Applies brand colors (primary → CTA button + headings, background → email background, text → body text)
  - Uses safe email font stack from BrandProfile
  - HTML-escapes all AI-generated text content
  - Validates and sanitizes all URLs (reject `javascript:`, `data:` schemes)
  - Renders footer block as-is (non-editable)
  - Handles missing optional blocks gracefully (omit section, don't crash)
  - Errors on missing required blocks per layout
- **Plain-text derivation:** Strip HTML, format blocks sequentially with line breaks
- **Store rendered output:** Write `renderedHtml` and `plainText` back to EmailDocument record

### 4. Non-Goals

- No Claude API calls — fixture data only
- No real image upload or storage — use project-owned fixture images
- No preview UI — HTML output verified by opening files directly in browser (Slice 5 adds preview)
- No PDF generation (V0.5 — Slice 8)
- No mobile-responsive email CSS — conservative table layout that works at any width
- No Litmus or automated email-client testing (Slice 6 does manual testing)

### 5. User-Visible Behavior

No user-facing UI in this slice. Renderer is a server-side utility. Verification is done by:
1. Running automated tests that check HTML output structure
2. Opening rendered HTML files directly in a browser to visually inspect (using project-owned fixture images)

### 6. Domain Entities Involved

| Entity | Role in this slice |
|---|---|
| EmailDocument | Input to renderer — blocks, subject, preheader, layoutId |
| EmailBlock (all subtypes) | Content slots filled into templates |
| BrandProfile | Colors, font stack, CTA style, footer applied to templates |
| Asset | Referenced by ImageEmailBlock.assetId — fixture images used |
| SourceFact | Present in fixtures but not used by renderer |
| ValidationResult | Not produced by renderer (produced by validator in Slice 4) |

### 7. Routes, Pages, and Components

No UI components in this slice. All files are server-side library code.

Likely module responsibilities; exact paths follow repository conventions established in Slice 1A:

- Main render function module: `renderEmail(doc, brand) → { html, plainText }`
- Template modules: one per layout (hero-cta, webinar-event, text-announcement, promotion-offer)
- Shared template scaffolding module (doctype, head, body wrapper, table structure)
- HTML escaping module
- URL sanitization module
- Plain-text derivation module
- Fixture data: one EmailDocument JSON per layout, one demo BrandProfile JSON, fixture image assets

### 8. Server Routes and Services

No API routes in this slice. Renderer is called programmatically by generation service (Slice 4) and preview page (Slice 5).

### 9. Persistence and Storage

Renderer reads EmailDocument and BrandProfile from database (or fixtures). After rendering, writes `renderedHtml` and `plainText` back to the EmailDocument record. No new tables or columns beyond what Slice 1B created.

### 10. LLM Behavior

Not applicable — no LLM calls. Fixture EmailDocuments simulate what Claude would return after the document-builder transforms model output into EmailDocument shape.

### 11. Renderer Behavior

This slice IS the renderer. Detailed rendering rules:

1. **Template selection:** `layoutId` on EmailDocument selects which template function to call
2. **Slot matching:** Each template declares required and optional slot IDs. Renderer matches EmailDocument blocks to template slots by block ID (which maps to slot ID in model output). Missing required slot → render error. Missing optional slot → section omitted.
3. **Brand color application:**
   - `colors.primary` → CTA button background, heading text color
   - `colors.background` → email body background (default: `#ffffff`)
   - `colors.text` → body text color (default: `#333333`)
   - `colors.accent` → optional accent elements (borders, dividers)
4. **Font stack:** `emailFontStack` from BrandProfile applied to all text. No custom font embedding — safe web fallbacks only.
5. **CTA style:** `defaultCtaStyle` from BrandProfile controls button rendering (filled → solid background, outline → border only)
6. **HTML escaping:** All `TextEmailBlock.content`, `ImageEmailBlock.altText`, `ButtonEmailBlock.label` values escaped before insertion. Escapes: `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`, `'` → `&#39;`
7. **URL sanitization:** All `ButtonEmailBlock.href` and image `src` URLs validated — must start with `http://` or `https://`. Reject `javascript:`, `data:`, empty, or malformed URLs.
8. **Footer:** Rendered from `BrandProfile.defaultFooterHtml` (or fallback demo footer). `FooterEmailBlock` from EmailDocument used if present; always `editable: false`.
9. **Table-based layout:** All templates use `<table>` with inline CSS. No `<div>` layout. Max width 600px, centered. Conservative approach for Gmail/Outlook.

### 12. Automated Tests

Likely test module responsibilities; exact paths follow repository conventions established in Slice 1A:

| Test area | What it covers |
|---|---|
| Render all layouts | Each of 4 layouts renders non-empty HTML from fixture data; each renders non-empty plain text; renderer is pure function (same input → same output) |
| HTML escaping | `<script>` in text content escaped; `"`, `&`, `<`, `>` in content properly escaped |
| URL sanitization | `javascript:` URLs rejected; `data:` URLs rejected; empty URLs rejected; `https://` and `http://` URLs accepted |
| Per-layout template tests | Each layout: correct elements present (headline, CTA, footer, images where required); brand primary color in CTA background |
| Plain text | Contains subject, headline, body text, CTA URL; no HTML tags in output |
| Missing blocks | Missing required block throws render error; missing optional block renders without error |

### 13. Manual Acceptance Test

| # | Check | Pass criteria |
|---|---|---|
| 1 | Open each layout's rendered HTML in browser | All four render without console errors, layout intact, content readable. Uses project-owned fixture images (not third-party placeholder URLs). |
| 2 | Brand colors visible | CTA button uses fixture brand primary color; heading uses primary color |
| 3 | No unescaped content | Fixture includes `&` and `<` in text — verify they appear as text, not HTML |
| 4 | Image alt text present | Hero image has meaningful alt text attribute |
| 5 | CTA button links correctly | Click CTA button — navigates to fixture CTA URL |
| 6 | Plain text readable | Open plain-text output — structured, readable, no HTML tags |
| 7 | Footer renders | Footer section present at bottom of all four layouts |
| 8 | Table-based structure | View source — only `<table>` layout, inline CSS |

### 14. Risks, Dependencies, and Stop-Conditions

| Risk | Mitigation |
|---|---|
| Template visual quality too low | Invest time in template design — this is the product's credibility. Use battle-tested email HTML patterns. |
| Outlook Word engine rendering | Manually open rendered HTML in Outlook early (even before Slice 6). Table-based layout mitigates most issues. |
| Slot mapping confusion between model output and renderer | Fixture JSON uses exact same slot IDs that the LLM contract specifies. Document mapping explicitly. |
| Third-party image dependency | All manual tests use project-owned fixture images. Automated tests may use mock URL strings but never fetch from external hosts. |

**Stop-condition:** If any template produces visually broken HTML in Chrome (structural layout failure, not cosmetic), fix before proceeding.

**Dependency:** Slice 1B complete (schema exists for EmailDocument and BrandProfile).

### 15. Completion Gate

- [ ] All four templates produce valid HTML from fixture data (no rendering errors)
- [ ] All four templates produce valid plain text from fixture data
- [ ] HTML opens in browser without errors for all four layouts, using project-owned fixture images
- [ ] Brand colors visible in CTA button and headings
- [ ] All text content properly HTML-escaped
- [ ] `javascript:` and `data:` URLs rejected by sanitizer
- [ ] Missing required block triggers render error
- [ ] Footer renders unchanged in all layouts
- [ ] Renderer is a pure function: same inputs → same output every time
- [ ] All automated tests pass

---

## Slice 3: Asset Upload + Storage Abstraction + Image Rendering

### 1. Objective

Users upload logo and campaign images through the UI; images persist via a pluggable storage adapter; renderer uses real image URLs instead of fixture images.

### 2. Sequencing Rationale

Asset upload comes after renderer (Slice 2) and before generation (Slice 4). Renderer already handles image slots with fixture images; this slice swaps fixtures for real uploaded images. Generation (Slice 4) needs image metadata (dimensions, alt text hints) in the prompt, so upload must exist first.

### 3. Included Functionality

- **StorageAdapter interface:** `upload(file, key)`, `getUrl(key)`, `delete(key)` methods. Clear contract for any implementation.
- **LocalStorageAdapter:** Real, working implementation for local development. Stores files in a local directory, serves via Next.js API route.
- **R2/S3-compatible adapter deployment gate:** Document the implementation contract (same StorageAdapter interface, S3-compatible SDK, bucket config via env vars). Before any deployed/shareable environment, implement and test a real R2/S3-compatible adapter with credentials. No stub that throws "not configured."
- **Asset upload API route:** Accepts multipart file upload, validates file type (png, jpg, jpeg, gif, webp) and size (max 5MB), stores via adapter, creates Asset record in Postgres
- **Logo upload in Brand Profile form:** Single image upload, updates `logoAssetId` on BrandProfile
- **Campaign image upload in Campaign Setup:** 1–3 images, updates `assetIds` on Campaign, image slot assignment UI
- **Image serving:** Local adapter serves via API route; R2/S3 adapter returns public URL directly
- **Renderer update:** Resolve `ImageEmailBlock.assetId` to actual URL via storage adapter instead of fixture images

### 4. Non-Goals

- No image processing, resizing, or optimization
- No AI-generated images
- No drag-and-drop upload (simple file input)
- No R2/S3 adapter built yet — interface documented, real implementation deferred to pre-deploy
- No image cropping or editing

### 5. User-Visible Behavior

- Brand Profile form: "Upload logo" area now functional. User selects image file, sees thumbnail preview after upload.
- Campaign Setup form: "Upload images" area now functional. User uploads 1–3 images, sees thumbnails, can remove an uploaded image. If selected layout requires an image, form validates at least one image uploaded.
- File type/size validation: non-image file → error message. >5MB file → error message.

### 6. Domain Entities Involved

| Entity | Role in this slice |
|---|---|
| Asset | Created on upload — stores metadata (filename, mimeType, sizeBytes, storageKey, dimensions, altText) |
| BrandProfile | `logoAssetId` updated when logo uploaded |
| Campaign | `assetIds` updated when campaign images uploaded |
| EmailDocument | Renderer resolves `ImageEmailBlock.assetId` to URL via Asset record + storage adapter |

### 7. Routes, Pages, and Components

Likely module/component responsibilities; exact paths follow repository conventions established in Slice 1A:

- Image upload component (file input, preview, remove)
- Logo upload component (single image, tied to BrandProfile)
- Campaign image upload component (1–3, slot assignment)
- Update brand profile form — wire logo upload
- Update campaign form — wire campaign image upload

### 8. Server Routes and Services

Likely module/component responsibilities; exact paths follow repository conventions established in Slice 1A:

- Asset upload API route (POST: multipart upload, validate, store, create record)
- Asset serving API route (GET: serve file from local storage in dev)
- StorageAdapter interface module
- LocalStorageAdapter implementation module
- File validation module (type allowlist, size limit)

**R2/S3-compatible adapter:** Not built in this slice. The StorageAdapter interface and the LocalStorageAdapter serve as the implementation contract. Before any deployed/shareable environment, a real R2/S3-compatible adapter must be implemented and tested with credentials. Document this as a deployment gate.

### 9. Persistence and Storage

| What | Where | Notes |
|---|---|---|
| Asset metadata | `assets` table (created in Slice 1B) | filename, mimeType, sizeBytes, storageKey, publicUrl, width, height, altText |
| Asset files (local dev) | Local directory (gitignored) | Files named by storageKey (uuid-based) |
| Asset files (deployed) | R2/S3 bucket | Adapter built before deploy — deployment gate |
| BrandProfile.logoAssetId | `brand_profiles` table | FK to assets.id, nullable |
| Campaign.assetIds | `campaigns` table | Text array of asset IDs |

### 10. LLM Behavior

Not applicable. Asset metadata (dimensions, altText hints) included in generation prompt in Slice 4.

### 11. Renderer Behavior

**Update to Slice 2 renderer:** `renderEmail` now resolves image URLs:
1. For each `ImageEmailBlock`, look up `Asset` record by `assetId`
2. Get URL from storage adapter: `adapter.getUrl(asset.storageKey)`
3. Insert resolved URL as `<img src="...">` in template
4. If asset not found, use fallback and add warning to validation

### 12. Automated Tests

Likely test module responsibilities; exact paths follow repository conventions:

| Test area | What it covers |
|---|---|
| Asset upload | Upload stores file and creates Asset record; correct metadata; reject non-image files (400); reject >5MB (400) |
| LocalStorageAdapter | `upload` writes file; `getUrl` returns API route URL; `delete` removes file |
| File validation | Accepts png/jpg/jpeg/gif/webp; rejects pdf/exe/txt; accepts under 5MB; rejects over 5MB |
| API routes | POST upload returns Asset record; GET serves file; logo upload updates BrandProfile; campaign image upload updates Campaign |
| Renderer image resolution | Renderer uses real Asset URLs when assets exist; renders fallback when asset missing |

### 13. Manual Acceptance Test

| # | Check | Pass criteria |
|---|---|---|
| 1 | Upload logo in Brand Profile | Select image, see thumbnail, save — persists on reload |
| 2 | Upload campaign images | Upload 1–3 images, see thumbnails, remove one — count updates |
| 3 | File type validation | Upload `.pdf` — see error |
| 4 | File size validation | Upload >5MB — see error |
| 5 | Renderer uses real images | Render with real Asset IDs — HTML contains actual image URLs |
| 6 | Image alt text | Uploaded image alt text appears in rendered HTML |

### 14. Risks, Dependencies, and Stop-Conditions

| Risk | Mitigation |
|---|---|
| Vercel serverless file upload limits | Next.js App Router supports streaming uploads. Configure body size limit if needed. |
| Local file serving in dev | Serve from API route, not `public/` dir. |
| R2/S3 not available for testing | LocalStorageAdapter is the real dev adapter. R2/S3 adapter is a deployment gate — built and tested with credentials before first deploy. |

**Stop-condition:** If multipart upload fails on Next.js App Router, switch to base64 upload with size limit.

**Dependency:** Slices 1A + 1B + 2 complete.

### 15. Completion Gate

- [ ] Upload stores file and creates Asset record with correct metadata
- [ ] Reject non-image files with clear error
- [ ] Reject files over 5MB with clear error
- [ ] Logo upload updates BrandProfile and displays in form
- [ ] Campaign image upload (1–3) updates Campaign and displays thumbnails
- [ ] Renderer uses real Asset URLs in output HTML
- [ ] LocalStorageAdapter fully functional for dev
- [ ] StorageAdapter interface documented as R2/S3 implementation contract
- [ ] R2/S3 adapter documented as deployment gate (not built yet, not a stub)
- [ ] All automated tests pass

---

## Slice 4: Claude Structured Generation + Schema Validation

### 1. Objective

Server-side generation route calls Claude Sonnet, returns validated structured JSON, creates an EmailDocument with rendered output, and wires the Generate button in the UI. End-to-end: campaign data in, rendered email HTML out.

### 2. Sequencing Rationale

Generation depends on all prior slices: schema + forms (1A/1B) for input data, renderer (2) for converting structured output to HTML, and assets (3) for image metadata in the prompt. This is the slice where the product hypothesis is first testable.

### 3. Included Functionality

- **Generation API route:** Receives campaign ID, loads Campaign + BrandProfile + SegmentCard + Assets, calls Claude, validates output, creates EmailDocument, renders HTML, returns document ID
- **Prompt builder:** Assembles system prompt + user prompt from all inputs
  - System prompt enforces all 9 LLM contract rules
  - User prompt includes: brand profile, campaign facts, segment card, layout + available slots, image metadata
- **Output schema validation:** Zod schema matching the LLM contract output format
- **One bounded retry:** On malformed output, retry once with stricter prompt suffix. On second failure, return structured error.
- **Document builder:** Transforms validated model output into EmailDocument structure — typed blocks with stable IDs, CTA from CampaignFacts (not model output), footer block (system-owned)
- **Validation runner:** Checks completed EmailDocument against all validation rules from spec — produces ValidationResult entries
- **Render on success:** Call renderer to produce HTML + plain text, store on EmailDocument
- **Wire UI:** Generate button triggers generation, shows loading state, redirects to preview on success

### 4. Non-Goals

- No preview UI (Slice 5)
- No multi-agent, no self-critique loop, no autonomous retry beyond one bounded retry
- No streaming — synchronous request/response
- No prompt caching or optimization
- No block-level regeneration (V0.5 — Slice 7)

### 5. User-Visible Behavior

- User clicks "Generate" → loading spinner → on success, campaign status changes to "generated"
- On failure: error message with retry button
- No silent fallback to generic copy or different layout

### 6. Domain Entities Involved

| Entity | Role in this slice |
|---|---|
| Campaign | Read: all fields + facts. Updated: status → generating → generated/failed |
| BrandProfile | Read: colors, tone, terms, font stack for prompt |
| SegmentCard | Read: motivation, objection, desired action for prompt |
| Asset | Read: metadata for image slot info in prompt |
| EmailDocument | Created: version 1, blocks, sourceFacts, validationResults, renderedHtml, plainText |
| EmailBlock | Created: typed union per model output block |
| SourceFact | Created: from model output assumptions + facts provenance |
| ValidationResult | Created: from validation runner |

### 7. Routes, Pages, and Components

Likely module/component responsibilities; exact paths follow repository conventions:

- Generate button component with loading/error states
- Wire generate button in campaign setup page

### 8. Server Routes and Services

Likely module/component responsibilities; exact paths follow repository conventions:

- Generation API route (POST: orchestrate full pipeline)
- Prompt builder module (system + user prompt assembly)
- System prompt module (static text with contract rules)
- Output schema module (Zod for model output validation)
- Document builder module (model output → EmailDocument)
- Claude client module (Anthropic SDK wrapper)
- Validation runner module (runs all checks, returns ValidationResult[])
- Validation rule modules: CTA, blocks, terms, assets, facts

### 9. Persistence and Storage

| What | Where | Notes |
|---|---|---|
| EmailDocument | `email_documents` table | version=1, status=generated, JSONB fields, renderedHtml + plainText |
| Campaign status | `campaigns` table | Updated: draft → generating → generated/failed |

### 10. LLM Behavior

**This slice IS the LLM integration.** Key details:

1. **Model:** Claude Sonnet (latest stable), via Anthropic SDK. Server-side only.
2. **System prompt:** Static text including all 9 contract rules. Key enforcements: use only confirmed facts, no HTML, respect layout slots, list missing inputs, obey prohibited terms.
3. **User prompt:** Structured data dump — brand, facts, segment, layout + slots, image metadata.
4. **Output parsing:** Extract JSON from model response (strip markdown fences if present), validate with Zod.
5. **Retry:** On Zod failure, retry once with error context and schema reminder. On second failure, return error.
6. **CTA override:** Model output CTA validated but replaced with CampaignFacts values if different.
7. **Timeout:** 60 seconds on Claude API call.

### 11. Renderer Behavior

Renderer (from Slice 2) called after document builder creates EmailDocument:
1. `renderEmail(emailDocument, brandProfile)` → `{ html, plainText }`
2. Results stored on EmailDocument
3. If renderer throws, generation still succeeds but status set to `needs_review` with render error in validationResults

### 12. Automated Tests

Likely test module responsibilities; exact paths follow repository conventions:

| Test area | What it covers |
|---|---|
| Output schema | Zod accepts valid output; rejects missing fields, wrong types, HTML in content |
| Prompt builder | Includes brand, facts, segment, layout, image metadata |
| Document builder | Correct block types per layout; stable UUIDs; CTA from CampaignFacts; footer locked |
| Claude client | Calls SDK correctly (mocked); handles API error; respects timeout |
| Retry logic | First malformed → retry with context; second failure → error; valid on retry → success |
| Validation runner | Missing CTA → error; invalid URL → error; prohibited term → warning; missing fact → warning |
| End-to-end (mocked) | Returns EmailDocument ID; has rendered HTML; campaign status updated |

### 13. Manual Acceptance Test

| # | Check | Pass criteria |
|---|---|---|
| 1 | Generate hero_cta | EmailDocument created with blocks |
| 2 | Generate all four layouts | Each produces valid EmailDocument |
| 3 | No HTML in output | No `<`, `>`, or HTML tags in any block content |
| 4 | CTA matches facts | CTA label/URL match CampaignFacts exactly |
| 5 | No invented facts | No dates, prices, offers not in CampaignFacts |
| 6 | Prohibited terms | Set "synergy" as prohibited — should not appear or should trigger warning |
| 7 | Rendered HTML exists | Non-empty renderedHtml and plainText on EmailDocument |
| 8 | UI flow | Click Generate → loading → status becomes "generated" |

### 14. Risks, Dependencies, and Stop-Conditions

| Risk | Mitigation |
|---|---|
| Claude API key not provisioned | Document env var requirement. Tests use mocked SDK. |
| Model output inconsistency | Expect prompt iteration. Keep system prompt in dedicated file. Log full output for debugging. |
| Zod schema mismatch | Build schema from spec output example. Test with real Claude output early. |
| Generation timeout | 60s generous for Sonnet. Vercel Pro allows 300s if needed. |
| Prompt quality | Make-or-break risk. Allocate time for iteration. |

**Stop-condition:** If Claude consistently fails to produce valid JSON after retry (>50% failure rate), stop and debug prompt before Slice 5.

**Dependency:** Slices 1A + 1B + 2 + 3 complete.

### 15. Completion Gate

- [ ] Generation route returns valid EmailDocument for each of four layouts
- [ ] No HTML in any block content
- [ ] CTA values match CampaignFacts
- [ ] Malformed output triggers one retry, then returns structured error
- [ ] ValidationResults populated on every generated document
- [ ] Prohibited terms flagged (warning severity)
- [ ] Missing campaign facts surfaced in validation
- [ ] Generated EmailDocument has non-empty renderedHtml and plainText
- [ ] Generate button shows loading state and updates campaign status
- [ ] All automated tests pass (mocked SDK)
- [ ] At least one successful end-to-end generation with real Claude API

---

## Slice 5: Preview UI + Validation Panel + Copy/Download HTML

### 1. Objective

User sees the generated email in a sandboxed preview (desktop + mobile), reads validation results, and can copy or download the rendered HTML. This completes the V0 end-to-end flow.

### 2. Sequencing Rationale

Preview requires generation (Slice 4) to produce an EmailDocument with rendered HTML. This is the slice where V0 becomes usable — before this, generated emails exist only as database records.

### 3. Included Functionality

- **Campaign preview page:**
  - Sandboxed iframe rendering the generated HTML (sandbox attribute, no allow-same-origin). This is a visual browser preview only — not a Gmail, Outlook, or deliverability simulation.
  - Desktop preview: iframe at 600px width
  - Mobile preview: iframe at 375px width
  - Desktop/mobile toggle
  - Subject line + preheader display
  - Campaign angle (collapsed by default)
- **Validation panel:**
  - Grouped by severity: errors, warnings, info
  - Each result: severity icon, code, message, affected block, suggested action
  - Error count badge
- **Export actions:**
  - Copy HTML to clipboard (blocked by render/schema/safety errors only, per Decision 13)
  - Download HTML file (blocked by any error-level validation)
  - Clear feedback on blocked actions
- **Navigation and states:**
  - Campaigns list with status badges
  - Generate flow: Campaign Setup → Generate → preview on success
  - Loading/generating state
  - Error state with retry
  - Empty state on campaigns list

### 4. Non-Goals

- No block editing (V0.5 — Slice 7)
- No PDF export (V0.5 — Slice 8)
- No test-email send (V0.5 — Slice 8)
- No email-client testing (Slice 6)
- No "inbox-ready," "Gmail verified," or "Outlook verified" claims — preview is a browser rendering only

### 5. User-Visible Behavior

**Full V0 flow works:**
1. Create Brand Profile → Campaign Setup → Generate → Preview
2. Preview shows: subject + preheader, desktop/mobile toggle, email in iframe, campaign angle, validation panel, Copy/Download HTML
3. Failure: error message + retry button
4. Campaigns list with status badges, empty state

### 6. Domain Entities Involved

| Entity | Role in this slice |
|---|---|
| EmailDocument | Read: renderedHtml, subject, preheader, validationResults |
| ValidationResult | Read: displayed in panel |
| Campaign | Read: status, name |

### 7. Routes, Pages, and Components

Likely module/component responsibilities; exact paths follow repository conventions:

- Campaign preview page
- Campaigns list page
- Email preview component (sandboxed iframe with width toggle)
- Validation panel component
- Preview toolbar component (toggle, copy, download)
- Generation status component (loading, error, retry)
- Campaign angle component (collapsible)
- Campaign card component (list item with status)
- Empty state component

### 8. Server Routes and Services

Likely module/component responsibilities; exact paths follow repository conventions:

- HTML serving route (GET: raw rendered HTML for iframe and download)
- Campaign detail route (GET: full campaign + emailDocument data)

### 9. Persistence and Storage

No new persistence. All data read from existing tables.

### 10. LLM Behavior

Not applicable.

### 11. Renderer Behavior

Not applicable — renderer already ran during generation. Preview displays stored `renderedHtml`.

### 12. Automated Tests

Likely test module responsibilities; exact paths follow repository conventions:

| Test area | What it covers |
|---|---|
| Email preview component | Iframe has sandbox attribute; desktop width=600px; mobile width=375px; toggle switches |
| Validation panel | Errors first, warnings second, info last; error count badge; empty state |
| Preview toolbar | Copy calls clipboard API; download creates file; buttons disabled on blocking errors; tooltip explains why |
| Generation status | Loading shows spinner; error shows message + retry; retry calls generate |
| Preview page | Loads with subject, preheader, iframe, validation panel; angle collapsed |
| Campaigns list | Shows status badges; empty state; create button |
| HTML route | Returns correct content-type; 404 when no EmailDocument |

### 13. Manual Acceptance Test

| # | Check | Pass criteria |
|---|---|---|
| 1 | Full end-to-end flow | Brand Profile → Campaign Setup → Generate → Preview — all works |
| 2 | Desktop preview | Iframe shows email at 600px, content readable, images visible, CTA present |
| 3 | Mobile preview | Toggle — iframe at 375px, email still readable |
| 4 | Subject and preheader | Displayed above preview, matching EmailDocument values |
| 5 | Validation panel | Errors and warnings visible, grouped by severity |
| 6 | Copy HTML | Paste in editor — matches rendered HTML |
| 7 | Download HTML | .html file saved, opens correctly in browser |
| 8 | Export blocked on errors | Error-level validation → buttons disabled with explanation |
| 9 | Error + retry | Generation failure → error message → retry works |
| 10 | Empty state | No campaigns → "No campaigns yet" with create button |
| 11 | No inbox claims | Preview UI does not label output as Gmail/Outlook verified or inbox-ready |

### 14. Risks, Dependencies, and Stop-Conditions

| Risk | Mitigation |
|---|---|
| iframe sandboxing | Use `sandbox=""` (most restrictive). Only displays static HTML. |
| Clipboard API | `navigator.clipboard.writeText` in modern browsers. Fallback: `document.execCommand('copy')`. |
| HTML download | `Blob` + `URL.createObjectURL` + click `<a>`. |

**Stop-condition:** If sandboxed iframe cannot display email HTML, use `srcdoc` attribute. If neither works, use styled `<div>` with explicit note.

**Dependency:** Slice 4 complete.

### 15. Completion Gate

- [ ] Full end-to-end flow works: Brand Profile → Campaign Setup → Generate → Preview
- [ ] Desktop (600px) and mobile (375px) preview work
- [ ] Subject/preheader display correct
- [ ] Validation panel groups by severity
- [ ] Copy HTML and Download HTML functional
- [ ] Export blocked on error-level validation with clear explanation
- [ ] Loading, error/retry, and empty states work
- [ ] Campaigns list shows status badges
- [ ] Preview does not claim email-client verification or inbox-readiness
- [ ] All automated tests pass

---

## Slice 6: Evaluation Fixtures + Gmail/Outlook Manual Testing

### 1. Objective

Validate V0 output quality with a fixed evaluation set across 3 brands, 5 campaigns, and 2 segments. Fix template rendering issues found in Gmail and Outlook. This is the quality gate before V0 can be demonstrated externally.

### 2. Sequencing Rationale

Evaluation must come after all V0 functionality is complete (Slices 0–5). Testing with real email clients before adding V0.5 editing features ensures the base templates are solid. Template fixes made here improve all future output.

### 3. Included Functionality

- **3 evaluation Brand Profiles:** Different industries, color palettes, tones
  - Brand A: SaaS (blues, professional/direct)
  - Brand B: E-commerce (warm colors, friendly/casual)
  - Brand C: Nonprofit (greens, empathetic/inspiring)
- **5 campaign briefs:** At least one per campaign type
- **2 Segment Cards:** new_customer, lapsed_customer
- **~15–20 generations:** Meaningful brand × campaign × segment combinations
- **Manual inspection:** Brand fidelity, factual accuracy, copy quality, layout correctness
- **Email client testing:** Gmail web and Outlook desktop for all four layouts. All manual email-client tests use project-owned fixture image assets served from a stable, controlled URL — not third-party placeholder services.
- **Document findings** with screenshots in evaluation results doc
- **Template fixes** for any rendering issues found
- **Prompt tuning** if output quality insufficient

### 4. Non-Goals

- No Litmus, Email on Acid, or automated visual regression
- No performance benchmarking
- No user testing with external participants

### 5. User-Visible Behavior

No new features. Users benefit from improved template quality and prompt accuracy.

### 6. Domain Entities Involved

All V0 entities used in evaluation — same as production use.

### 7. Routes, Pages, and Components

No new routes or components. Evaluation uses existing V0 UI.

Likely files; exact paths follow repository conventions:
- Evaluation fixture data (brands, campaigns, segments as JSON)
- Evaluation results document
- Optional: seed script to load all fixtures

### 8. Server Routes and Services

No new routes. Uses existing generation endpoint and preview UI.

### 9. Persistence and Storage

Evaluation data in same database. Seed script creates entities from fixture files.

### 10. LLM Behavior

Uses existing generation. Evaluation may reveal prompt issues — all changes documented with before/after examples.

### 11. Renderer Behavior

Uses existing renderer. Email client testing may reveal issues — all template fixes documented.

### 12. Automated Tests

One new test: all fixture campaigns generate without pipeline error (validates schema, renderer runs — not output quality).

### 13. Manual Acceptance Test

| # | Check | Pass criteria |
|---|---|---|
| 1 | All fixture combinations generate | 15–20 generations complete without errors |
| 2 | No invented facts | Manual review: no dates/prices/offers not in CampaignFacts |
| 3 | Brand colors reflected | Each brand's primary color visible in CTA and headings |
| 4 | Tone appropriate | SaaS=professional, E-commerce=friendly, Nonprofit=empathetic |
| 5 | Prohibited terms absent | None found in outputs |
| 6 | Gmail web — all four layouts | Layout intact, images load, CTA clickable, colors correct. Uses project-owned fixture images. |
| 7 | Outlook desktop — all four layouts | Layout intact (table structure), no broken elements. Uses project-owned fixture images. |
| 8 | V0 success criteria met | All 6 criteria from spec reviewed and passing |

### 14. Risks, Dependencies, and Stop-Conditions

| Risk | Mitigation |
|---|---|
| Outlook desktop access | Need Windows/VM with Outlook. If unavailable, document gap. |
| Output quality insufficient | Budget 2–3 rounds of prompt tuning. Keep change log. |
| Template fixes break tests | Run full suite after every change. |

**Stop-condition:** If >30% of generations produce output a marketer would immediately discard, diagnose prompt vs template quality before declaring V0 complete.

**Dependency:** Slices 0–5 complete.

### 15. Completion Gate

- [ ] All fixture combinations generate without pipeline errors
- [ ] No invented facts in manual review
- [ ] Brand fidelity visible across all brands
- [ ] All four layouts render acceptably in Gmail web (using project-owned images)
- [ ] All four layouts render acceptably in Outlook desktop — or gap documented
- [ ] Template fixes applied for rendering issues
- [ ] Prompt adjustments documented with before/after
- [ ] Evaluation results documented with pass/fail per combination
- [ ] V0 success criteria from spec reviewed and met

---

## Slice 7 (V0.5): Versioned Persistence + Block Editing + Targeted Regeneration + Layout Switch

### 1. Objective

User edits individual email blocks, regenerates specific blocks via Claude, switches layouts with content preservation, and navigates version history with restore. Every change creates an immutable version snapshot.

### 2. Sequencing Rationale

V0.5 features, built after V0 is validated (Slice 6). Versioning must exist before editing so every change is recoverable. Block-level regeneration requires generation infrastructure from Slice 4. Layout switching requires renderer from Slice 2.

### 3. Included Functionality

- **Version snapshot on every change:** New EmailDocument row with incremented version. Old rows immutable.
- **Version history UI:** List versions, preview any, restore (creates new version copying historical state).
- **Inline block editing:** subject, preheader, headline, body/supporting copy, CTA label, CTA URL, image alt text. Footer locked (editable=false).
- **Image replacement:** Swap campaign image on a block → re-render, new version.
- **Block-level regeneration:** Claude call for single block with full document context → update only that block → new version.
- **Manual layout switching:** Switch among four layouts, map compatible content, warn before dropping incompatible blocks → new version.
- **Validation rerun:** After every change.

### 4. Non-Goals

- No drag-and-drop
- No arbitrary layout restructuring
- No segment variants (V1)
- No footer editing
- No collaborative editing
- No diff view between versions

### 5. User-Visible Behavior

- Preview page shows edit affordances: click editable text, "Regenerate" per block, "Replace Image" on image blocks
- Footer shows lock icon
- Layout switcher in toolbar
- Version history panel: timestamps, restore button
- Every change auto-saves as new version
- Validation panel updates after every change

### 6. Domain Entities Involved

| Entity | Role |
|---|---|
| EmailDocument | Versioned: new row per change |
| EmailBlock | Edited content, updated assetId, updated href/label |
| ValidationResult | Recomputed per change |
| Asset | Image replacement creates new Asset |

### 7. Routes, Pages, and Components

Likely module/component responsibilities; exact paths follow repository conventions:

- Block editor component (inline text editing)
- Block regenerate button component
- Image replace component
- Layout switcher component with confirmation dialog
- Version history component
- Locked block component (footer)
- Update preview page with editing UI

### 8. Server Routes and Services

Likely module/component responsibilities; exact paths follow repository conventions:

- Edit block route (POST: edit → new version)
- Regenerate block route (POST: Claude call → new version)
- Replace image route (POST: new image → new version)
- Switch layout route (POST: map blocks → new version)
- Versions list route (GET: all versions)
- Version detail/restore route (GET, POST)
- Version creation module
- Version restore module
- Layout block mapper module
- Block regeneration module (prompt + Claude call + validation)

### 9. Persistence and Storage

| What | Where | Notes |
|---|---|---|
| EmailDocument versions | `email_documents` table | New row per version, same campaign_id, incremented version |
| Image replacements | `assets` table + storage | New Asset per replacement; old preserved |

No schema changes — `email_documents` already supports multiple rows per campaign.

### 10. LLM Behavior

**Block-level regeneration:**
1. System prompt: same as full generation + "regenerate ONLY the block at slot `{slotId}`"
2. User prompt: full document blocks (context), brand, segment, target block
3. Output: single block object
4. Validation: Zod on single block. One retry on failure.
5. Integration: updated block replaces only targeted block. New version created.

### 11. Renderer Behavior

Re-rendering after every change: edit → re-render, regeneration → re-render, image replace → re-render, layout switch → re-render. Renderer (Slice 2) unchanged — called by version creation module.

### 12. Automated Tests

Likely test module responsibilities; exact paths follow repository conventions:

| Test area | What it covers |
|---|---|
| Version creation | Edit creates new version; old preserved; new has updated block; re-rendered |
| Version restore | Creates new version (not modifies old); blocks from historical; version incremented |
| Layout mapper | Compatible blocks transfer; incompatible identified; warning generated |
| Block regeneration | Changes only targeted block; others unchanged; footer rejected; invalid ID errors |
| Edit block API | Creates new version; subject/preheader editable; CTA editable; footer rejected |
| Regenerate block API | Triggers Claude (mocked); new version; non-targeted blocks unchanged |
| Layout switch API | Maps compatible blocks; new version; validation rerun |
| Versions API | Lists in descending order; restore creates new version |
| Validation rerun | Reruns after edit, regeneration, layout switch; stored on new version |

### 13. Manual Acceptance Test

| # | Check | Pass criteria |
|---|---|---|
| 1 | Edit headline | Click, type, save → preview updates, new version |
| 2 | Edit CTA label | Change label → updates, new version |
| 3 | Edit subject | Edit subject → updates, new version |
| 4 | Footer locked | No edit affordance, lock icon visible |
| 5 | Regenerate one block | "Regenerate" on body → new content, headline unchanged |
| 6 | Replace image | New image → preview updates |
| 7 | Switch layout | hero_cta → text_announcement → warning → confirm → new layout |
| 8 | Version history | List of versions with timestamps |
| 9 | Restore version | Restore v2 when at v5 → new v6 with v2's content |
| 10 | Validation updates | Clear CTA URL → error appears → fix → error clears |

### 14. Risks, Dependencies, and Stop-Conditions

| Risk | Mitigation |
|---|---|
| Regeneration prompt quality | Include surrounding block context. Test multiple cycles. |
| Version storage growth | Full blocks + HTML per version. Fine for V0.5 limited users. Monitor. |
| Layout mapping edge cases | Explicit mapping table. Test all 12 transitions. |

**Stop-condition:** If block-level regeneration consistently fails coherence, simplify to full regeneration with preserved edits. Document limitation.

**Dependency:** Slices 0–6 complete (V0 validated).

### 15. Completion Gate

- [ ] Edit creates new version; old preserved and restorable
- [ ] Regenerate changes only targeted block; others unchanged
- [ ] Footer not editable
- [ ] Image replacement works with re-render
- [ ] Layout switch preserves compatible blocks, warns on incompatible
- [ ] Version history lists snapshots with timestamps
- [ ] Restore creates new version with historical state
- [ ] Validation reruns after every change
- [ ] V0.5 success criteria 1 and 2 from spec met
- [ ] All automated tests pass

---

## Slice 8 (V0.5): Plain-Text/PDF Export + Resend Test Email + Instrumentation

### 1. Objective

User downloads HTML, plain text, and PDF exports. User sends test emails via Resend to individual addresses. All usage events are instrumented.

### 2. Sequencing Rationale

Final V0.5 features, built after editing/versioning (Slice 7) are stable. PDF export needs rendered HTML. Test email needs rendered HTML and validation gating. Instrumentation wraps all actions from prior slices.

### 3. Included Functionality

- **HTML download:** Current renderedHtml as `.html` file. Blocked by error-level validation.
- **Plain-text download:** Current plainText as `.txt` file. Blocked by error-level validation.
- **PDF approval export:** Server-side browser rendering (Puppeteer/Playwright) of email HTML to PDF. Stored via storage adapter. Browser-print fallback acceptable if server-side unavailable on Vercel. Blocked by error-level validation.
- **Test-email send via Resend:**
  - Manual entry of individual test addresses
  - Email format validation
  - Subject prefixed with `[TEST]`
  - Send current rendered HTML
  - Record status + Resend message ID
  - Blocked by error-level validation
- **Usage instrumentation:** All spec-listed events wired:
  - `generation_started`, `generation_completed`, `generation_failed`
  - `preview_viewed`, `html_copied`, `html_downloaded`
  - `plain_text_downloaded`, `pdf_downloaded`
  - `test_email_sent`
  - `block_edited`, `block_regenerated`, `layout_switched`
  - `version_saved`, `version_restored`
  - Events logged to console + stored in events table

### 4. Non-Goals

- No recipient lists, bulk sends, scheduling
- No ESP integration; Resend is limited to individual V0.5 test sends
- No marketing automation
- No analytics dashboard (events stored in database only)
- No email tracking (opens, clicks)

### 5. User-Visible Behavior

- Preview toolbar: Copy HTML, Download HTML, Download Plain Text, Download PDF, Send Test Email
- All download/send buttons disabled with explanation when error-level validation exists
- Test send dialog: enter address → Send → "Sending..." → "Sent!" or error
- PDF may show "Generating PDF..." loading state

### 6. Domain Entities Involved

| Entity | Role |
|---|---|
| EmailDocument | Read: renderedHtml, plainText, validationResults |
| Asset | Created: PDF stored as export asset |
| TestSend (new) | Records each test send |
| Event (new) | Records each tracked event |

### 7. Routes, Pages, and Components

Likely module/component responsibilities; exact paths follow repository conventions:

- Export panel component (download buttons, gating)
- Test send dialog component
- Update preview toolbar

### 8. Server Routes and Services

Likely module/component responsibilities; exact paths follow repository conventions:

- HTML export route (GET: downloadable file, gated)
- Plain-text export route (GET: downloadable file, gated)
- PDF export route (GET: generate + serve, gated)
- Test send route (POST: validate, send via Resend, record)
- Email sender module (Resend wrapper)
- PDF generator module (HTML → PDF)
- Instrumentation module (`trackEvent(name, metadata)`)
- Events API route (POST: record client-side events)

### 9. Persistence and Storage

| What | Where | Notes |
|---|---|---|
| Test sends | `test_sends` table (new) | email_document_id, recipient_email, subject, resend_message_id, status, error_message, created_at |
| Events | `events` table (new) | event_name, metadata (jsonb), campaign_id, email_document_id, created_at |
| PDF exports | `assets` table + storage | type="export" |

**Migration:** Add `test_sends` and `events` tables.

### 10. LLM Behavior

Not applicable. Instrumentation tracks generation events from Slice 4 retroactively.

### 11. Renderer Behavior

Not applicable. PDF generator takes existing rendered HTML.

### 12. Automated Tests

Likely test module responsibilities; exact paths follow repository conventions:

| Test area | What it covers |
|---|---|
| HTML export | Returns HTML with content-disposition; blocked (403) on errors; correct content |
| Plain-text export | Returns text; blocked on errors; matches plainText |
| PDF export | Produces non-empty buffer; stored as Asset; pdfAssetId set; blocked on errors |
| Test send | Valid email sends (mocked Resend); [TEST] prefix; status recorded; invalid email → 400; blocked on errors |
| Instrumentation | trackEvent logs + inserts; all spec events fire at correct points |

### 13. Manual Acceptance Test

| # | Check | Pass criteria |
|---|---|---|
| 1 | Download HTML | .html file, opens correctly |
| 2 | Download Plain Text | .txt file, no HTML tags |
| 3 | Download PDF | .pdf file, email content visible |
| 4 | Send test email | Arrives with [TEST] prefix |
| 5 | Test email content | Brand colors, images, correct HTML |
| 6 | Invalid email rejected | Validation error, no send |
| 7 | Export blocked on errors | All buttons disabled with explanation |
| 8 | Copy HTML not blocked by warnings | Per Decision 13 |
| 9 | Send recorded | test_sends table has record with message ID |
| 10 | Events logged | Full flow → events table has all spec events |

### 14. Risks, Dependencies, and Stop-Conditions

| Risk | Mitigation |
|---|---|
| PDF on Vercel serverless | Options: `@sparticuz/chromium`, `playwright-aws-lambda`, browser-print fallback. Evaluate at implementation. |
| Resend API key | Document env var requirement. Tests use mocked client. |
| PDF quality | Table-based HTML renders reasonably. Approval artifact, not final deliverable. |

**Stop-condition:** If server-side PDF cannot work on Vercel, implement browser-print fallback and document limitation.

**Dependency:** Slice 7 complete. Resend API key provisioned.

### 15. Completion Gate

- [ ] HTML download works with correct content
- [ ] Plain-text download works, no HTML
- [ ] PDF generation produces readable PDF
- [ ] Test email arrives with [TEST] prefix
- [ ] Invalid email rejected
- [ ] Export/send blocked on error-level validation
- [ ] Copy HTML NOT blocked by warnings (Decision 13)
- [ ] Send status + message ID recorded
- [ ] All spec-listed events fire correctly
- [ ] Events stored with correct metadata
- [ ] V0.5 success criteria 3, 4, 5 from spec met
- [ ] All automated tests pass

---

## Unresolved Decisions

These need resolution before or during implementation. None block Slice 0.

| # | Decision | Blocks Slice | Options | Notes |
|---|---|---|---|---|
| 1 | V0 visual system (palette, typography, density) | Slice 1A | Approved after Slice 0 wireframe review (Decision 25) | Must optimize for calm, clear, trustworthy workspace |
| 2 | Managed Postgres provider | Before first deploy (after Slice 5) | Neon, Supabase, or equivalent | Decision 20 |
| 3 | R2/S3 bucket provider + adapter | Before first deploy (Slice 3 documents gate) | Cloudflare R2, AWS S3, Tigris | R2 preferred |
| 4 | PDF rendering library | Slice 8 | Puppeteer + @sparticuz/chromium, Playwright, browser-print fallback | Evaluate Vercel compatibility |
| 5 | Component library or headless UI | Slice 1A | None (raw Tailwind), Radix UI, Headless UI | Evaluate if form complexity warrants library |
| 6 | Test framework | Slice 1A | Vitest (recommended), Jest | Vitest preferred for speed and ESM |
| 7 | Instrumentation destination (post-V0.5) | After Slice 8 | PostHog, Amplitude, simple analytics | V0.5 logs to database |

---

## Files Inspected

| File | Purpose |
|---|---|
| `docs/superpowers/specs/2026-09-01-email-agent-v0-design.md` | Canonical design spec — all requirements sourced from here |
| `docs/email-agent-decisions.md` | 26 non-negotiable decisions — constraints applied throughout |
| `design/v0-ui/Main.dc.html` | Existing wireframe — assessed for reusability |
| `design/v0-ui/canvas.json` | Canvas config |
| `design/v0-ui/DirectionA.dc.html`, `DirectionB.dc.html`, `DirectionC.dc.html` | Visual direction reference material |

## Files Updated

| File | Change |
|---|---|
| `docs/superpowers/specs/2026-09-01-email-agent-v0-design.md` | Added canonical architecture and interaction diagrams; aligned storage, evaluation, versioning, and wireframe-reference wording |
| `docs/email-agent-v0-v0.5-implementation-plan.md` | Added binding references to the canonical diagrams without changing slice scope or order |
| `docs/email-agent-decisions.md` | Added the binding-diagrams process decision |

## Scope Confirmation

- No application code written
- No wireframes modified
- All content within approved V0/V0.5 boundaries
- Architecture and product scope unchanged
- Implementation slice order unchanged
