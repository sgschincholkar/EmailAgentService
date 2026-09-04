/**
 * Verified current Sonnet model id, kept as a code default only because it
 * matches the current Anthropic docs/console at implementation time.
 * ANTHROPIC_MODEL in .env.local overrides this without a code change.
 */
const DEFAULT_MODEL = "claude-sonnet-5";

export function getModelId(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

export const GENERATION_TIMEOUT_MS = 60_000;
