# Email Agent Service

AI email-campaign draft tool. Marketer provides a brand profile, campaign
brief, and confirmed facts; Claude generates structured copy; a deterministic
renderer turns it into on-brand, table-based HTML across four fixed layouts.

## Core architecture

- `EmailDocument` is the canonical representation. Rendered HTML and plain
  text are derived artifacts, never the source of truth.
- Claude returns structured JSON only — never raw HTML. A deterministic
  renderer builds HTML from four fixed layouts (`hero_cta`, `webinar_event`,
  `text_announcement`, `promotion_offer`).
- Every edit, Claude regeneration, image replacement, and layout switch
  creates a new immutable `EmailDocument` version. No version is ever
  updated in place.
- Customer-provided images only — no AI-generated, stock, or scraped images
  anywhere in the pipeline.
- Confirmed `CampaignFacts` are the only source for dates, prices, offers,
  and CTA content. Claude never invents these; missing facts are surfaced as
  warnings, not guessed.

See `docs/email-agent-decisions.md` for the full list of non-negotiable
architecture decisions, and `AGENTS.md` for the required workflow when
changing this codebase.

## Stack

Next.js (App Router) + TypeScript, Tailwind CSS, Drizzle ORM + Postgres,
Zod, Anthropic SDK (Claude), Vitest.

## Local setup

Requires Node.js and a local Postgres instance.

```bash
npm install
cp .env.example .env.local   # then set ANTHROPIC_API_KEY
```

`.env.local`:

```
DATABASE_URL="postgresql://email_agent:email_agent_dev@localhost:5432/email_agent_dev"
ANTHROPIC_API_KEY="<your key>"
ANTHROPIC_MODEL="claude-sonnet-5"
```

Run migrations, then start the dev server:

```bash
npx drizzle-kit push
npm run dev
```

App runs at `http://localhost:3000`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm test` | Run the Vitest suite |
| `npm run test:watch` | Vitest in watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## What's implemented

- Brand Profile and Campaign Setup flows, with progressive disclosure by
  campaign type.
- Claude-driven generation into a validated `EmailDocument`, rendered
  deterministically across the four fixed layouts.
- Preview UI: desktop/mobile toggle, subject/preheader, Quick Checks
  (validation panel), Copy HTML, Download HTML.
- Manual block editing, targeted single-block Claude regeneration, hero
  image replacement, and manual layout switching — each creates a new
  immutable version; history is preserved and restorable.
- Version history with current/latest/historical/read-only states.
- Accessible form validation (focus management, ARIA-linked errors, actionable
  error summaries) and redirect-surviving "saved as version N" feedback.

## What's explicitly not built (V0/V0.5 scope)

No ESP integration, no live or bulk sends, no PDF export, no plain-text
download, no test-email send, no AI-generated imagery, no analytics, no
segment variants. See `docs/email-agent-decisions.md` for the full boundary
and `AGENTS.md` for what requires explicit product-owner approval before
starting.

## Working on this repo

Read `AGENTS.md` first — it defines the required pre-change and completion
report format, the slice-gated workflow, and what's prohibited without
explicit approval. `CLAUDE.md` is the Claude Code entry point and points
back to `AGENTS.md` plus the canonical design documents:

- `docs/email-agent-decisions.md`
- `docs/superpowers/specs/2026-09-01-email-agent-v0-design.md`
- `docs/email-agent-v0-v0.5-implementation-plan.md`
