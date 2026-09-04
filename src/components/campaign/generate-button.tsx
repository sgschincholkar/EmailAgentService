"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type GenerateButtonProps = {
  campaignId: string;
  status: "draft" | "generating" | "generated" | "failed";
};

export function GenerateButton({ campaignId, status }: GenerateButtonProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/generate`, {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string; emailDocumentId?: string }
        | null;

      if (!response.ok) {
        setError(body?.error ?? "Generation failed. Try again.");
        return;
      }

      router.refresh();
    } catch {
      setError("Generation failed. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="generate-panel">
      <button
        className="button primary"
        disabled={generating}
        onClick={handleGenerate}
        type="button"
      >
        {generating ? "Writing in your brand voice…" : "Generate email"}
      </button>
      {status === "generated" ? (
        <p className="field-hint">This campaign has a generated draft.</p>
      ) : null}
      {status === "failed" ? (
        <p className="form-error">The last generation attempt failed. Try again.</p>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
