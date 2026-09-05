"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { LAYOUT_LABELS, LAYOUT_OPTIONS } from "@/domain/campaign-facts";
import type { EmailDocument, LayoutId } from "@/domain/schemas";
import { mapBlocksToLayout } from "@/generation/layout-block-mapper";

type LayoutSwitchPanelProps = {
  campaignId: string;
  document: EmailDocument;
};

const BLOCK_LABELS: Record<string, string> = {
  hero_image: "Hero image",
  headline: "Headline",
  body: "Body",
  event_details: "Event details",
  offer_details: "Offer details",
  cta: "Button",
};

function blockLabel(blockId: string): string {
  return BLOCK_LABELS[blockId] ?? blockId;
}

export function LayoutSwitchPanel({ campaignId, document }: LayoutSwitchPanelProps) {
  const router = useRouter();
  const otherLayouts = LAYOUT_OPTIONS.filter((option) => option.id !== document.layoutId);

  const [targetLayoutId, setTargetLayoutId] = useState<LayoutId | "">("");
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ latestVersion: number } | null>(null);

  const preview = targetLayoutId
    ? mapBlocksToLayout(document.blocks, targetLayoutId)
    : null;

  async function handleConfirmSwitch() {
    if (!targetLayoutId) return;

    setError(null);
    setConflict(null);
    setSwitching(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/email-documents/switch-layout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseDocumentId: document.id,
          expectedVersion: document.version,
          targetLayoutId,
        }),
      });
      const body = await response.json().catch(() => null);

      if (response.status === 409) {
        setConflict({ latestVersion: body?.latestVersion ?? document.version });
        return;
      }
      if (!response.ok) {
        setError(body?.error ?? "Couldn't switch the layout. Try again.");
        return;
      }

      router.push(`/campaigns/${campaignId}/preview?version=${body.version}&created=1`);
    } catch {
      setError("Couldn't switch the layout. Try again.");
    } finally {
      setSwitching(false);
    }
  }

  function handleReloadLatest() {
    router.push(`/campaigns/${campaignId}/preview`);
    router.refresh();
  }

  return (
    <section aria-label="Switch layout" className="layout-switch-panel">
      <h2>Switch layout</h2>
      <p className="field-hint">Currently using {LAYOUT_LABELS[document.layoutId]}.</p>

      <div className="field">
        <label htmlFor="switch-layout-target">Switch to</label>
        <select
          id="switch-layout-target"
          onChange={(event) => {
            setTargetLayoutId(event.target.value as LayoutId | "");
            setError(null);
          }}
          value={targetLayoutId}
        >
          <option value="">Choose a layout…</option>
          {otherLayouts.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {preview ? (
        <div className="layout-switch-preview" role="status">
          {preview.kept.length > 0 ? (
            <p>
              <strong>Kept:</strong> {preview.kept.map(blockLabel).join(", ")}
            </p>
          ) : null}
          {preview.removed.length > 0 ? (
            <p>
              <strong>Removed:</strong> {preview.removed.map(blockLabel).join(", ")}
            </p>
          ) : null}
          {preview.missingRequired.length > 0 ? (
            <p className="form-error">
              This layout needs {preview.missingRequired.map(blockLabel).join(", ")}, which
              isn&apos;t set on this draft. Add that content on a layout that has this field,
              then switch again.
            </p>
          ) : null}

          <div className="form-actions">
            <button
              className="button primary"
              disabled={switching || preview.missingRequired.length > 0}
              onClick={handleConfirmSwitch}
              type="button"
            >
              {switching ? "Switching…" : "Confirm switch"}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      {conflict ? (
        <div className="form-error">
          <p>
            A newer version (v{conflict.latestVersion}) already exists. Reload before switching
            layouts.
          </p>
          <button className="compact-control" onClick={handleReloadLatest} type="button">
            Reload latest version
          </button>
        </div>
      ) : null}
    </section>
  );
}
