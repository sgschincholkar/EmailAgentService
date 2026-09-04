import type { z } from "zod";

import { callClaude, extractJson } from "./claude-client";

export class GenerationValidationError extends Error {}

const RETRY_SUFFIX = `

Your previous response did not match the required schema. Return corrected
JSON only, matching the schema exactly. Do not include any text, markdown,
or code fences outside the JSON object.`;

/**
 * Calls Claude, validates the response against the given Zod schema, and
 * retries exactly once — only on a schema validation failure — with a
 * stricter prompt suffix. A second failure returns a structured error; no
 * further attempts.
 */
export async function generateWithRetry<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const firstAttempt = await tryGenerate(systemPrompt, userPrompt, schema);
  if (firstAttempt.success) return firstAttempt.data;

  const retryAttempt = await tryGenerate(
    systemPrompt,
    userPrompt + RETRY_SUFFIX,
    schema,
  );
  if (retryAttempt.success) return retryAttempt.data;

  throw new GenerationValidationError(
    "Claude returned invalid output twice. Generation failed.",
  );
}

async function tryGenerate<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
): Promise<{ success: true; data: T } | { success: false }> {
  // callClaude failures (network, timeout, rate limit) are infra errors and
  // propagate immediately — only a malformed response (unparseable JSON or
  // a schema mismatch) counts as a retry-eligible "malformed output".
  const rawText = await callClaude(systemPrompt, userPrompt);

  try {
    const parsedJson = extractJson(rawText);
    const result = schema.safeParse(parsedJson);
    if (!result.success) {
      if (process.env.GENERATION_DEBUG) {
        console.error("Schema validation failed. Raw text:", rawText);
        console.error("Zod issues:", JSON.stringify(result.error.issues, null, 2));
      }
      return { success: false };
    }
    return { success: true, data: result.data };
  } catch (err) {
    if (process.env.GENERATION_DEBUG) {
      console.error("JSON parse failed. Raw text:", rawText, "Error:", err);
    }
    return { success: false };
  }
}
