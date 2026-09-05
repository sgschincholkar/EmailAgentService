# Email Agent Service — Agent Instructions

These instructions apply to every agent working in this repository.

## Required Reading

Before proposing or changing anything, read:

1. `docs/email-agent-decisions.md`
2. `docs/superpowers/specs/2026-09-01-email-agent-v0-design.md`
3. `docs/email-agent-v0-v0.5-implementation-plan.md`

If instructions conflict, use this priority order:

1. Current explicit product-owner instruction
2. `docs/email-agent-decisions.md`
3. Canonical design specification
4. Approved implementation plan
5. Existing code and wireframes

## Slice-Gated Work

- Follow the approved implementation plan one slice at a time.
- Work is complete through:
  - Slice 6B: Targeted Single-Block Claude Regeneration
  - Slice 6 evaluation: fixture matrix, real-Claude quality gate, results doc
  - V0.5 image replacement (hero_image asset swap, new immutable version)
  - V0.5 manual layout switching (switch among the 4 fixed layouts, block-id
    mapping, no invented content, no Claude call)
  - UI/UX accessibility pass (focus management, ARIA wiring, version-state
    badges, redirect-surviving status banners, tap-target fixes)
- Do not begin PDF export, plain-text download, Resend/test send, Brevo,
  public storage, analytics, variants, or any other later-scope work without
  explicit product-owner approval.
- Do not start later scope or pull it forward.
- Stop after completing each slice, report the result, and wait for explicit product-owner approval before continuing.
- Existing wireframes are reference material only. Slice 0 defines the approved V0 interaction and visual contract.
- Do not change product scope, architecture, dependencies, security posture, version boundaries, or slice order without explicit product-owner approval.

## Non-Negotiable Product and Architecture Rules

- `EmailDocument` is the canonical representation. HTML, plain text, and PDF are derived artifacts.
- Claude or another LLM returns structured JSON only, never raw email HTML.
- A deterministic renderer creates HTML from the four fixed layouts defined in the canonical specification.
- Use customer-provided images only. Do not generate, replace, source, or select stock images with AI.
- Confirmed `CampaignFacts` are the only source for factual campaign content.
- Never invent dates, prices, offers, product claims, eligibility, CTA labels, or URLs.
- V0 and V0.5 have no ESP integration.
- Never perform live or bulk marketing sends.
- Resend is limited to V0.5 individual test-email sends.
- Brevo is limited to Future V1 draft publishing.
- Asset binary files never go in Postgres; store only metadata and references there.
- Local asset storage is development-only. R2/S3-compatible object storage is required before any deployed or shareable environment.
- Do not add autonomous multi-agent workflows in V0 or V0.5.

## Security and Validation

- Keep secrets server-side. Never expose credentials, API keys, or privileged operations to browser code, generated output, logs, fixtures, or commits.
- Validate and sanitize CTA, asset, and other external URLs before use.
- Escape generated text before deterministic rendering.
- Enforce error-level validation gates before export or test send. Error-level results block HTML download, PDF export, and test send; Copy HTML follows the narrower schema, rendering, and safety-error gate in the canonical decisions.
- Keep warning-level results visible and non-blocking.
- Do not claim Gmail or Outlook compatibility before the evaluation slice verifies it.

## Required Pre-Change Report

Before editing, report:

- the approved slice and task;
- the exact files to modify;
- any ambiguity or risk;
- whether the change affects scope, architecture, dependencies, or security.

If scope, architecture, dependencies, or security would change, request explicit product-owner approval before editing.

## Required Completion Report

After work, report:

- changed files;
- tests and checks actually run;
- acceptance criteria with pass/fail status;
- deferred work;
- unresolved issues.

Then stop and wait for product-owner approval.

## Prohibited Without Explicit Approval

Agents must not:

- start later slices or expand the approved slice;
- add authentication, billing, teams, ESP integrations, bulk sending, arbitrary HTML import, a drag-and-drop builder, AI imagery, CRM/CDP integration, or segment variants;
- add functionality outside the approved scope;
- delete, rename, move, or overwrite existing files.

When uncertain, stop and ask the product owner rather than widening scope.


<claude-mem-context>
# Memory Context

# [EmailAgentService] recent context, 2026-09-04 2:37pm GMT+5:30

No previous sessions found.
</claude-mem-context>