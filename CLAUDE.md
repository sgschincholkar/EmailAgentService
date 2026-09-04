# Claude Code Entry Point

Read and follow `AGENTS.md` before proposing or changing anything.

Canonical documents:

- `docs/email-agent-decisions.md`
- `docs/superpowers/specs/2026-09-01-email-agent-v0-design.md`
- `docs/email-agent-v0-v0.5-implementation-plan.md`

Slice 0 is approved and complete.

Current approved work is Slice 1A: App Shell, Shared Domain Schemas, and Brand Profile Flow.
Do not begin Slice 1B or any later slice without explicit product-owner approval.

Core rules:

- `EmailDocument` is canonical; HTML, plain text, and PDF are derived artifacts.
- Claude/LLM output is structured JSON only, never raw email HTML.
- V0 and V0.5 have no ESP integration.
- Never perform live marketing sends.
- Do not modify product scope, architecture, dependencies, security posture, version boundaries, or slice order without explicit product-owner approval.
- Stop after each slice, report against its acceptance criteria, and wait for approval.

Use the pre-change and completion reports required by `AGENTS.md`.
