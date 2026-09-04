# V0 Wireframe Annotations

These Slice 0 wireframes define the proposed V0 interaction and visual contract for product-owner review. Existing direction files remain reference material only. The neutral product chrome, typography, spacing, and component styling shown here are design decisions for review, not a mandated final visual system.

## Artboard Index

| Artboard | Purpose | Primary entities |
|---|---|---|
| `design/v0-ui/Main.dc.html` | Friendly three-stage overview: brand, campaign, and review | All V0 entities at workflow level |
| `design/v0-ui/BrandProfile.dc.html` | Brand identity, voice, terminology, CTA, and footer defaults | `BrandProfile`, logo `Asset` |
| `design/v0-ui/CampaignSetup.dc.html` | Core campaign inputs, conditional and advanced facts, fixed layout, images, and inline audience definition | `Campaign`, `CampaignFacts`, `SegmentCard`, campaign-image `Asset` |
| `design/v0-ui/Preview.dc.html` | Subject, preheader, draft approach, rendered output, quiet checks, and HTML actions | `EmailDocument`, `ValidationResult`, derived HTML |
| `design/v0-ui/States.dc.html` | Empty, form-error, generating, timeout/failure, and retry states | UI state around `Campaign` and generation |

## Brand Profile

Required fields are marked with an asterisk. Optional or recommended fields are labelled in place.

The default view shows only Brand name, Logo upload, Primary color, Tone presets, and Voice notes. Secondary/accent/background/text colors, Font preference, Words to use, Words to avoid, Button style, and Email footer remain mapped exactly as below but sit behind the collapsed **Add more brand details** disclosure.

| Wireframe field | Entity mapping | Requirement and behavior |
|---|---|---|
| Brand name | `BrandProfile.name` | Required |
| Logo upload | `Asset` referenced by `BrandProfile.logoAssetId` | Recommended, not required; accepts customer-provided logo only |
| Primary color | `BrandProfile.primaryColor` | Required; hex input and swatch preview |
| Secondary, accent, background, text colors | Corresponding `BrandProfile` color fields | Optional; hex inputs and swatches |
| Preferred font | `BrandProfile.preferredFont` | Optional and captured as preference; email uses a safe fallback stack |
| Tone presets | `BrandProfile.tonePresets` | At least one required; multi-select chips |
| Voice notes | `BrandProfile.voiceNotes` | Optional free text |
| Preferred terms | `BrandProfile.preferredTerms` | Optional list input |
| Prohibited terms | `BrandProfile.prohibitedTerms` | Optional list input; matches are warning-level by default in V0 |
| CTA style | `BrandProfile.defaultCtaStyle` | Required; filled is the default, outline is the alternative |
| Footer content | `BrandProfile.defaultFooterContent` | Required; a demo default may be provided |

`Save and continue` validates required values and color formats, persists the profile in the eventual implementation, and advances to Campaign Setup. The logo file is stored outside Postgres; only its metadata and reference map to `Asset`.

## Campaign Setup

### Progressive disclosure

- The core campaign section, layout selector, customer-image upload, and lightweight audience questions are visible by default in one continuous column.
- Selecting `feature_launch` or `announcement` reveals Product or feature name.
- Selecting `promotion` reveals Offer / discount / price text.
- Selecting `webinar` reveals Event date/time and Speaker. The artboard shows this state.
- Advanced confirmed facts are collapsed by default. Expanding reveals Start date, End date, Eligibility / terms, Required claims / proof points, and Additional confirmed facts.
- Changing campaign type preserves compatible values and asks for confirmation before discarding incompatible populated facts.

### Entity mapping

| Wireframe field | Entity mapping | Requirement and behavior |
|---|---|---|
| Campaign name | `Campaign.name` | Required |
| Campaign type | `Campaign.type` | Required; controls conditional facts |
| Objective | `Campaign.objective` | Required |
| Campaign brief | `Campaign.brief` | Required |
| CTA label | `Campaign.ctaLabel` | Required; confirmed input, never invented |
| CTA destination URL | `Campaign.ctaUrl` | Required; validate and sanitize URL before use |
| Selected layout | `Campaign.selectedLayoutId` | Required; exactly one of the four fixed layout IDs |
| Customer images | `Asset` records referenced by campaign | 1–3 customer-provided images; at least one for image-required layouts; binaries remain outside Postgres |
| Product or feature name | `CampaignFacts.productOrFeatureName` | Conditional for feature launch and announcement |
| Offer / discount / price text | `CampaignFacts.offerText` | Conditional for promotion |
| Event date/time | `CampaignFacts.eventDateTime` | Conditional for webinar |
| Speaker | `CampaignFacts.speaker` | Conditional for webinar |
| Start/end dates | `CampaignFacts.startDate`, `CampaignFacts.endDate` | Optional; advanced section |
| Eligibility / terms | `CampaignFacts.eligibilityTerms` | Optional; advanced section |
| Required claims / proof points | `CampaignFacts.requiredClaims` | Optional; advanced section |
| Additional confirmed facts | `CampaignFacts.additionalFacts` | Optional; advanced section |
| Segment name | `SegmentCard.name` | Required |
| Lifecycle stage | `SegmentCard.lifecycleStage` | Optional |
| Primary motivation | `SegmentCard.primaryMotivation` | Required |
| Primary objection | `SegmentCard.primaryObjection` | Required |
| Desired action | `SegmentCard.desiredAction` | Required |
| Messaging notes | `SegmentCard.messagingNotes` | Optional |

The four fixed layouts remain `hero_cta`, `webinar_event`, `text_announcement`, and `promotion_offer`. Customer-facing labels are **Visual spotlight**, **Event invitation**, **Simple announcement**, and **Offer highlight**; internal IDs are not exposed. The campaign-relevant recommendation appears first, with the remaining choices alongside it. Their thumbnails communicate structure only; they are not editable canvases. `Create my draft` validates the form, saves the campaign inputs, and starts one generation action using Brand Profile, confirmed Campaign Facts, Segment Card, selected layout, and image metadata. The LLM output remains structured JSON only, never HTML.

Audience questions use marketer-facing labels while preserving the `SegmentCard` mapping: “Who is this email for?”, “What matters most to them?”, “What might hold them back?”, and “What do you want them to do?” Example placeholders show the expected level of detail without adding new data.

## Preview and Export

| UI element | Entity or artifact mapping | Behavior |
|---|---|---|
| Subject | `EmailDocument.subject` | Read-only in V0 |
| Preheader | `EmailDocument.preheader` | Read-only in V0 |
| Draft approach / campaign angle | `EmailDocument.campaignAngle` | Concise, collapsed by default; artboard shows expanded state |
| Email preview | Derived rendered HTML from canonical `EmailDocument` | Sandboxed iframe or equivalent; visual browser preview only, not an email-client or deliverability simulation |
| Desktop/mobile toggle | Preview-only UI state | Changes preview width; does not change stored content |
| Quick checks | `EmailDocument.validationResults[]` / `ValidationResult` | Presents error, warning, and info results in plain language; detailed results sit behind View all checks |
| Copy HTML | Derived HTML action | Blocked only by schema, rendering, or safety errors |
| Download HTML | Derived HTML action | Blocked by every error-level validation result |

The generated `EmailDocument` is persisted as version 1 and is the canonical source of truth. V0 has no user-facing version-history UI. HTML and plain text are derived artifacts. The example email uses a clearly separate customer brand treatment so application chrome cannot be mistaken for email output.

Warnings remain visible and do not block either HTML action. Error-level results block Download HTML. Schema, rendering, and safety errors also block Copy HTML. The wireframe translates an invalid-URL safety error into the calm customer-facing instruction “Fix this before downloading: add a complete web address”; internal error terminology remains available only in expanded detail. There is no automatic approval state and no claim that the output is inbox-ready or verified in Gmail or Outlook.

## State Inventory

| State | Trigger | Required response |
|---|---|---|
| Empty | No campaigns exist | Explain the starting point and offer Create campaign |
| Form validation error | Generate or save attempted with invalid/missing required fields | Show a form-level summary, inline messages, and focus the first invalid field |
| Generating/loading | Create my draft request accepted | Keep inputs safe; cycle through “Writing in your brand voice,” “Shaping the message for your audience,” and “Preparing your email” |
| Generation failure | Generation fails, times out, or the one malformed-output correction retry fails | Show a visible recoverable error, preserve inputs, offer Retry generation and return to setup |
| Success preview | A valid `EmailDocument` is rendered and validated | Show subject, preheader, angle, desktop/mobile preview, validation results, Copy HTML, and Download HTML |

Timeout duration and exact progress-message timing are implementation choices. The UI must not show fake percentage completion.

## Interaction and Scope Boundaries

- V0 ends at Copy HTML and Download HTML. It has no content editing, PDF, test email, version-history UI, segment variants, ESP publishing, or live/bulk sending.
- Resend test email belongs to V0.5 and Brevo draft publishing belongs to Future V1; neither appears as an action in these wireframes.
- Generation never invents dates, prices, offers, product claims, eligibility, CTA labels, or URLs. Confirmed `CampaignFacts` are the sole factual source.
- The product UI remains neutral. Customer Brand Profile colors and imagery apply inside rendered email output only.
- Asset upload areas accept customer-provided files. They do not imply AI imagery, stock search, or generated replacements.
- Fixed layout selection is not a drag-and-drop builder, arbitrary HTML importer, or WYSIWYG editor.
- The preview is not an inbox simulation. Gmail/Outlook compatibility is verified only in the later evaluation slice.

## Visual Decisions for Review

- Warm neutral surfaces, a light navigation treatment, muted teal actions, and restrained borders distinguish product UI without competing with customer campaign branding.
- A three-stage progress line covers Brand Profile, Campaign Setup, and Review. Generate remains a transient action and state, not a persistent destination.
- Brand Profile presents one spacious flow with five essentials visible and a single **Add more brand details** disclosure for the remaining approved fields.
- Campaign Setup uses one guided column. The `SegmentCard` remains intact in the data model but appears as lightweight audience questions rather than a second questionnaire.
- Preview gives the rendered email most of the available space. **Quick checks** remain quiet but persistent, with plain-language action guidance and a **View all checks** disclosure.
- Typography, palette, spacing, exact control styles, layout-thumbnail art direction, breakpoint behavior, upload mechanics, and timeout copy remain subject to product-owner review after Slice 0.
