# Claude Code Entry Point

Read and follow `AGENTS.md` before proposing or changing anything.

Canonical documents:

- `docs/email-agent-decisions.md`
- `docs/superpowers/specs/2026-09-01-email-agent-v0-design.md`
- `docs/email-agent-v0-v0.5-implementation-plan.md`

Work is complete through:
- Slice 6B: Targeted Single-Block Claude Regeneration
- Slice 6 evaluation: fixture matrix, real-Claude quality gate, results doc
- V0.5 image replacement (hero_image asset swap, new immutable version)
- V0.5 manual layout switching (switch among the 4 fixed layouts, block-id
  mapping, no invented content, no Claude call)
- UI/UX accessibility pass (focus management, ARIA wiring, version-state
  badges, redirect-surviving status banners, tap-target fixes)

Do not begin PDF export, plain-text download, Resend/test send, Brevo,
public storage, analytics, variants, or any other later-scope work without
explicit product-owner approval.

Core rules:

- `EmailDocument` is canonical; HTML, plain text, and PDF are derived artifacts.
- Claude/LLM output is structured JSON only, never raw email HTML.
- V0 and V0.5 have no ESP integration.
- Never perform live marketing sends.
- Do not modify product scope, architecture, dependencies, security posture, version boundaries, or slice order without explicit product-owner approval.
- Stop after each slice, report against its acceptance criteria, and wait for approval.

Use the pre-change and completion reports required by `AGENTS.md`.
