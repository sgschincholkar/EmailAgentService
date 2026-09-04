import Anthropic from "@anthropic-ai/sdk";

import { GENERATION_TIMEOUT_MS, getModelId } from "./model";

export class ClaudeCallError extends Error {}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (client) return client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ClaudeCallError("ANTHROPIC_API_KEY is not configured.");
  }

  client = new Anthropic({ apiKey, timeout: GENERATION_TIMEOUT_MS });
  return client;
}

/**
 * One synchronous Claude call. Never logs or returns the API key. Errors
 * (timeout, rate limit, network, invalid key) are mapped to a generic
 * ClaudeCallError — SDK internals never reach the caller's response body.
 */
export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  try {
    const response = await getClient().messages.create({
      model: getModelId(),
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new ClaudeCallError("Claude returned no text content.");
    }

    return textBlock.text;
  } catch (error) {
    if (error instanceof ClaudeCallError) throw error;
    throw new ClaudeCallError("Generation request failed. Try again.");
  }
}

/**
 * Extracts a JSON object from a model response, stripping markdown code
 * fences if the model wrapped its output in them despite instructions not
 * to.
 */
export function extractJson(rawText: string): unknown {
  const trimmed = rawText.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = fenced ? fenced[1] : trimmed;

  try {
    return JSON.parse(jsonText);
  } catch {
    throw new ClaudeCallError("Claude returned output that isn't valid JSON.");
  }
}
