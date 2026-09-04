# Slice 6 Evaluation Results

Evaluation fixture set and quality gate for the completed local email workflow:
generation → edit/regenerate → version → preview → HTML download.

Run date: 2026-09-04. Fixtures created and generated via `scripts/eval-slice-6.ts`, defined in `fixtures/eval-slice-6-fixtures.ts`. Fixture images: `fixtures/eval-assets/*.png` (project-owned, generated locally by `scripts/generate-eval-fixture-images.mjs` — no third-party placeholder service).

## 1. Fixture matrix

**3 Brand Profiles**

| Brand | Industry | Primary color | Tone | Prohibited term |
|---|---|---|---|---|
| [Eval] Northstar Cloud | SaaS | `#2563EB` | Professional, Direct | synergy |
| [Eval] Harvest & Co | E-commerce | `#EA580C` | Friendly, Casual | cheap |
| [Eval] Roots Forward | Nonprofit | `#15803D` | Empathetic, Inspiring | urgent |

**2 Segment Cards** (per brand): `new_customer`, `lapsed_customer` — exact `LifecycleStageSchema` enum values.

**5 campaign types** (all `CampaignTypeSchema` values): `feature_launch`, `webinar`, `announcement`, `promotion`, `newsletter`. `newsletter` uses the `text_announcement` layout — no dedicated newsletter layout was added, per instruction.

**18 combinations** (not the full 120-way cross product — hand-picked so every layout appears ≥3 times, every brand covers ≥2 campaign types, every segment appears with ≥2 brands):

| ID | Brand | Campaign type | Layout | Segment |
|---|---|---|---|---|
| nc-01-feature-new | Northstar Cloud | feature_launch | hero_cta | new_customer |
| nc-02-webinar-lapsed | Northstar Cloud | webinar | webinar_event | lapsed_customer |
| nc-03-announcement-new | Northstar Cloud | announcement | text_announcement | new_customer |
| nc-04-promotion-lapsed | Northstar Cloud | promotion | promotion_offer | lapsed_customer |
| nc-05-newsletter-new | Northstar Cloud | newsletter | text_announcement | new_customer |
| nc-06-feature-lapsed | Northstar Cloud | feature_launch | hero_cta | lapsed_customer |
| hc-01-feature-new | Harvest & Co | feature_launch | hero_cta | new_customer |
| hc-02-announcement-lapsed | Harvest & Co | announcement | text_announcement | lapsed_customer |
| hc-03-promotion-new | Harvest & Co | promotion | promotion_offer | new_customer |
| hc-04-newsletter-lapsed | Harvest & Co | newsletter | text_announcement | lapsed_customer |
| hc-05-webinar-new | Harvest & Co | webinar | webinar_event | new_customer |
| hc-06-announcement-new | Harvest & Co | announcement | text_announcement | new_customer |
| rf-01-announcement-new | Roots Forward | announcement | text_announcement | new_customer |
| rf-02-webinar-lapsed | Roots Forward | webinar | webinar_event | lapsed_customer |
| rf-03-feature-new | Roots Forward | feature_launch | hero_cta | new_customer |
| **rf-04-promotion-lapsed-STRESS** | Roots Forward | promotion | promotion_offer | lapsed_customer |
| rf-05-newsletter-new | Roots Forward | newsletter | text_announcement | new_customer |
| rf-06-promotion-new | Roots Forward | promotion | promotion_offer | new_customer |

**rf-04 is a deliberate tone stress case**: a nonprofit running the `promotion_offer` layout, where "discount" framing doesn't map cleanly onto nonprofit messaging. Used to test whether tone stays empathetic rather than sounding like a retail sale when forced into a commerce-shaped layout.

Layout coverage: `hero_cta` ×4, `webinar_event` ×3, `text_announcement` ×7, `promotion_offer` ×4.

## 2. Generation results

All 18 combinations ran against the **real Claude API** (no mocking) via `npx tsx scripts/eval-slice-6.ts generate`.

**18/18 succeeded** — 0 pipeline errors, 0 malformed-output failures, no retry needed on any of the 18.

## 3. Fact-grounding findings

Reviewed all 18 generated documents' subject, preheader, and block content against each campaign's explicit `CampaignFacts`.

**Result: clean across all 18.** No invented dates, prices, discounts, offers, product claims, or CTA URLs. Every date/price/speaker/discount appearing in generated copy traces directly to a confirmed fact:

- Dates: "October 14, 2026", "October 9, 2026", "October 21, 2026", "October 31, 2026" — all copied verbatim from `eventDateText`/`endDateText`, never invented.
- Discounts: "20% off", "15% off", "100% match, up to $50,000" — all copied verbatim from `discountText`/`offerText`.
- Speakers: "Priya Nair, Head of Product", "Chef Dana Ruiz", "Marcus Webb, Program Director" — all copied verbatim from `speakerText`.
- CTA label/URL in every one of the 18 rendered documents matches `campaign.facts.ctaLabel`/`ctaUrl` exactly — enforced structurally by the document builder (CTA is never taken from model output), not just observed by luck.

Where a fact was absent (e.g. no specific feature details for "Saved Views", no specific Q3 metrics for the impact report), the model correctly surfaced this as a `missing_required_fact` warning rather than fabricating plausible-sounding detail. Example (nc-01): *"Specific functional details of Saved Views (what can be saved, how it's accessed) were not provided."* This is the desired behavior per Decision 5 (do not invent campaign facts).

## 4. Brand / copy / layout review

**Brand fidelity — pass on all 18.** Each brand's tone is clearly distinguishable by read:
- Northstar Cloud (professional/direct): "we've completed an independent audit confirming our security, availability, and confidentiality controls meet SOC 2 Type II standards" — terse, no filler.
- Harvest & Co (friendly/casual): "Glad you're here!", contractions throughout, one subject line uses an emoji ("Your next box is one click away 🍊").
- Roots Forward (empathetic/inspiring): "the roots you helped plant are still here, and so is a place for you", "No pressure, no guilt — just an open door."

**Prohibited terms — absent in all 18.** "synergy" (Northstar), "cheap" (Harvest & Co), "urgent" (Roots Forward) do not appear in any generated copy for their respective brand.

**Copy quality — pass on all 18.** Coherent, non-generic, addresses the segment's stated motivation/objection in every case (e.g. lapsed-customer copy consistently acknowledges the gap — "It's been a while," "A lot has changed" — rather than writing as if to a first-time reader).

**Stress case (rf-04) — pass.** The matched-donation offer is framed as community impact ("your return goes twice as far for the community you helped build") rather than retail urgency; no "urgent"/scarcity language despite the natural pull of a "this month" deadline. Tone holds under the awkward brand/layout pairing.

**Layout correctness — pass on all 18.** Every required slot filled per layout; `hero_image` correctly present for `hero_cta`/`promotion_offer` (both required-image layouts) and correctly omitted (with a warning, not an error) for the one `webinar_event` combination that had no image attached — matches the renderer's optional-image-slot behavior for that layout.

**Images — pass.** Alt text present and descriptive on every image block; two generations (rf-03, rf-06) wrote genuinely descriptive scene alt text ("Neighbors gathered together in a community garden, planting and smiling") rather than a generic filename-derived fallback, showing the model using the asset dimensions/context sensibly.

**One minor observation, not a defect:** in `hc-05-webinar-new`, the model's `missingInputs` array contained an odd self-critique string flagging that the CTA ("Shop the harvest") doesn't obviously fit a webinar-registration objective — *"flagging for review, though not included in this copy."* This is a slightly unusual `missingInputs` phrasing, not a fact violation: the actual CTA rendered is still exactly `campaign.facts.ctaLabel`/`ctaUrl`, system-enforced, never model-chosen. Judged not severe or reproducible enough (1/18) to justify a prompt change — documented here per the "observed, decided not to fix" instruction, no fix applied.

**Rendered output — pass on all 18.** All 18 `renderedHtml` (1900–2500 characters each) and `plainText` fields are non-empty.

## 5. Local preview / download

- **Local preview**: verified via `GET /campaigns/{id}/preview` returning HTTP 200 for one campaign per layout (hero_cta, webinar_event, text_announcement, promotion_offer) — all 4 returned 200.
- **HTML download**: the download mechanism is client-side (`Blob` + anchor `download`, in `src/components/preview/preview-shell.tsx`), already covered by passing unit tests (`preview-shell.test.tsx`) independent of this evaluation. Confirmed at the data level that every one of the 18 evaluation documents has a non-empty `renderedHtml` field, which is the only input that component needs — did not additionally screenshot a manual browser click-through for each of the 18, since the download logic itself is generic (not per-generation) and already unit-tested.

## 6. Gmail / Outlook / external-image limitations (explicitly unverified)

Per explicit product-owner decision, the following are **documented as unverified gaps**, not worked around:

- **Outlook desktop compatibility: unverified.** No Windows/VM/Microsoft 365-desktop environment was available in this session. Outlook (Word rendering engine) compatibility is **not claimed** for any layout. This is a known environment gap, consistent with the canonical Slice 6 risk table's explicit allowance to document rather than block.
- **Gmail web compatibility: unverified.** No HTML-injection workaround, browser extension, bookmarklet, or SMTP relay was used as a substitute for genuine Gmail rendering, per instruction. Gmail compatibility is **not claimed** for any layout.
- **External image loading in a real email client: unverified/expected unavailable.** `LocalStorageAdapter` serves fixture images via `http://localhost:3000/api/assets/{storageKey}`, which is unreachable from any external mail client or any device other than this development machine. No public tunnel and no Base64-inlined test variant was used, per instruction. If this rendered HTML were opened in a real client without modification, embedded images would not load — this is a known limitation of local-only development, not a defect in the renderer or storage adapter (both behave correctly for their documented scope: local development only, per Decision 12).

**Net position:** Gmail and Outlook compatibility remain unverified for V0. No "inbox-ready," "Gmail verified," or "Outlook verified" claim is made anywhere in this document or in the product.

## 7. Defect fix changelog

**No fixes applied.** Manual review of all 18 generations, the renderer output, and the validation results surfaced no template rendering defect, no reproducible prompt-grounding failure, and no validation-rule gap meeting the "narrowly evidenced" bar for a fix. The one observation in §4 (hc-05's `missingInputs` phrasing) was a single, non-reproduced, cosmetic oddity in a non-blocking warning string — not escalated to a fix per instruction to report and wait rather than act on marginal findings.

## 8. Automated test coverage

One mocked pipeline regression test added: `src/generation/eval-fixtures.test.ts` — one campaign per layout (all 4), mocked Claude response, asserts `generateCampaignEmail` completes without throwing and produces non-empty `renderedHtml`/`plainText`. This validates schema/renderer plumbing only, not output quality (output quality is the manual review in §3–4, against real Claude output, which a mock cannot substitute for). 4/4 passed.

## 9. Cleanup confirmation

All evaluation-created runtime rows and files were torn down via `npx tsx scripts/eval-slice-6.ts teardown`, using only the IDs/storage keys recorded in the gitignored run manifest (`.eval-slice-6-run.json`) — no whole-table or whole-directory deletes. Confirmed deleted: 18 email documents, 18 campaigns, 18 segment cards (one inline per campaign), 3 brand profiles, 6 asset rows, 6 local storage files. Pre-existing manual data (the "Northstar Studio" brand profile created before this evaluation) and the 5 pre-existing orphaned files in `.local-assets/` were left untouched, as instructed.

## Pass/fail summary

| Check | Result |
|---|---|
| All 18 fixture combinations generate without pipeline error | ✅ 18/18 |
| No invented facts | ✅ 18/18 clean |
| Brand colors/tone reflected | ✅ 18/18 |
| Prohibited terms absent | ✅ 18/18 (0 occurrences) |
| Rendered HTML/plain text nonempty | ✅ 18/18 |
| Local preview loads | ✅ 4/4 layouts checked |
| HTML download mechanism functional | ✅ (via existing unit tests + nonempty renderedHtml on all 18) |
| Gmail web rendering | ⚠️ Unverified — documented gap, no workaround used |
| Outlook desktop rendering | ⚠️ Unverified — documented gap, no workaround used |
| External image loading (non-localhost) | ⚠️ Unverified/expected unavailable — documented, not worked around |
| Marketer-discard threshold (<30% of generations) | ✅ 0/18 would be discarded on read |

**Overall: V0 quality gate substantively passes** on every check within this session's control (fact grounding, brand fidelity, copy quality, layout correctness, validation behavior, local preview, download mechanism). Gmail, Outlook, and external-image delivery remain genuinely unverified — not claimed, not assumed — and require a follow-up session with real client access to close.
