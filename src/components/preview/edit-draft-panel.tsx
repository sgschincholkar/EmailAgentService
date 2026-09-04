"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { LAYOUT_SLOTS } from "@/renderer/layout-slots";
import type { EmailDocument, LayoutId } from "@/domain/schemas";

type EditDraftPanelProps = {
  campaignId: string;
  document: EmailDocument;
};

type FieldState = Record<string, string>;

function blockContent(document: EmailDocument, blockId: string): string {
  const block = document.blocks.find((candidate) => candidate.id === blockId);
  if (!block) return "";
  if (block.type === "text" || block.type === "headline") return block.content;
  if (block.type === "image") return block.altText;
  if (block.type === "button") return "";
  return "";
}

export function EditDraftPanel({ campaignId, document }: EditDraftPanelProps) {
  const router = useRouter();
  const layoutId: LayoutId = document.layoutId;
  const textSlots = LAYOUT_SLOTS[layoutId].filter(
    (slot) => slot.kind === "text" && document.blocks.some((b) => b.id === slot.slotId),
  );
  const hasImageSlot = LAYOUT_SLOTS[layoutId].some(
    (slot) => slot.kind === "image" && document.blocks.some((b) => b.id === slot.slotId),
  );
  const ctaBlock = document.blocks.find((b) => b.id === "cta" && b.type === "button");

  const [subject, setSubject] = useState(document.subject);
  const [preheader, setPreheader] = useState(document.preheader);
  const [textValues, setTextValues] = useState<FieldState>(() => {
    const initial: FieldState = {};
    for (const slot of textSlots) initial[slot.slotId] = blockContent(document, slot.slotId);
    return initial;
  });
  const [altText, setAltText] = useState(
    hasImageSlot ? blockContent(document, "hero_image") : "",
  );
  const [ctaLabel, setCtaLabel] = useState(
    ctaBlock && ctaBlock.type === "button" ? ctaBlock.label : "",
  );
  const [ctaHref, setCtaHref] = useState(
    ctaBlock && ctaBlock.type === "button" ? ctaBlock.href : "",
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ latestVersion: number } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function buildEdits() {
    const edits: Array<
      | { target: "document"; field: "subject" | "preheader"; value: string }
      | {
          target: "block";
          blockId: "headline" | "body" | "event_details" | "offer_details" | "cta" | "hero_image";
          field: "content" | "label" | "href" | "altText";
          value: string;
        }
    > = [];

    if (subject !== document.subject) {
      edits.push({ target: "document", field: "subject", value: subject });
    }
    if (preheader !== document.preheader) {
      edits.push({ target: "document", field: "preheader", value: preheader });
    }
    for (const slot of textSlots) {
      const original = blockContent(document, slot.slotId);
      if (textValues[slot.slotId] !== original) {
        edits.push({
          target: "block",
          blockId: slot.slotId as "headline" | "body" | "event_details" | "offer_details",
          field: "content",
          value: textValues[slot.slotId],
        });
      }
    }
    if (hasImageSlot && altText !== blockContent(document, "hero_image")) {
      edits.push({ target: "block", blockId: "hero_image", field: "altText", value: altText });
    }
    if (ctaBlock && ctaBlock.type === "button") {
      if (ctaLabel !== ctaBlock.label) {
        edits.push({ target: "block", blockId: "cta", field: "label", value: ctaLabel });
      }
      if (ctaHref !== ctaBlock.href) {
        edits.push({ target: "block", blockId: "cta", field: "href", value: ctaHref });
      }
    }

    return edits;
  }

  async function handleSave() {
    const edits = buildEdits();
    if (edits.length === 0) {
      setError("No changes to save.");
      return;
    }

    setError(null);
    setConflict(null);
    setSuccessMessage(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/email-documents/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseDocumentId: document.id,
          expectedVersion: document.version,
          edits,
        }),
      });
      const body = await response.json().catch(() => null);

      if (response.status === 409) {
        setConflict({ latestVersion: body?.latestVersion ?? document.version });
        return;
      }
      if (!response.ok) {
        setError(body?.error ?? "Couldn't save this edit. Try again.");
        return;
      }

      setSuccessMessage(`Saved as version ${body.version}.`);
      router.push(`/campaigns/${campaignId}/preview?version=${body.version}`);
    } catch {
      setError("Couldn't save this edit. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleReloadLatest() {
    router.push(`/campaigns/${campaignId}/preview`);
    router.refresh();
  }

  return (
    <section aria-label="Edit draft" className="edit-draft-panel">
      <h2>Edit draft</h2>
      <p className="field-hint">Editing version {document.version}.</p>

      <div className="field">
        <label htmlFor="edit-subject">Subject</label>
        <input
          id="edit-subject"
          onChange={(event) => setSubject(event.target.value)}
          value={subject}
        />
      </div>

      <div className="field">
        <label htmlFor="edit-preheader">Preheader</label>
        <input
          id="edit-preheader"
          onChange={(event) => setPreheader(event.target.value)}
          value={preheader}
        />
      </div>

      {textSlots.map((slot) => (
        <div className="field" key={slot.slotId}>
          <label htmlFor={`edit-block-${slot.slotId}`}>{slotLabel(slot.slotId)}</label>
          <textarea
            id={`edit-block-${slot.slotId}`}
            onChange={(event) =>
              setTextValues((current) => ({ ...current, [slot.slotId]: event.target.value }))
            }
            rows={4}
            value={textValues[slot.slotId] ?? ""}
          />
        </div>
      ))}

      {hasImageSlot ? (
        <div className="field">
          <label htmlFor="edit-alt-text">Image description</label>
          <input
            id="edit-alt-text"
            onChange={(event) => setAltText(event.target.value)}
            value={altText}
          />
        </div>
      ) : null}

      {ctaBlock ? (
        <div className="two-column-fields">
          <div className="field">
            <label htmlFor="edit-cta-label">Button label</label>
            <input
              id="edit-cta-label"
              onChange={(event) => setCtaLabel(event.target.value)}
              value={ctaLabel}
            />
          </div>
          <div className="field">
            <label htmlFor="edit-cta-href">Button destination URL</label>
            <input
              id="edit-cta-href"
              onChange={(event) => setCtaHref(event.target.value)}
              placeholder="https://example.com"
              value={ctaHref}
            />
          </div>
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
      {successMessage ? <p className="field-hint">{successMessage}</p> : null}

      {conflict ? (
        <div className="form-error">
          <p>
            A newer version (v{conflict.latestVersion}) already exists. Your edits here are
            still filled in, but they were saved from an older version.
          </p>
          <button onClick={handleReloadLatest} type="button">
            Reload latest version
          </button>
        </div>
      ) : null}

      <div className="form-actions">
        <button
          className="button primary"
          disabled={saving}
          onClick={handleSave}
          type="button"
        >
          {saving ? "Saving version…" : "Save edit"}
        </button>
      </div>
    </section>
  );
}

function slotLabel(slotId: string): string {
  switch (slotId) {
    case "headline":
      return "Headline";
    case "body":
      return "Body";
    case "event_details":
      return "Event details";
    case "offer_details":
      return "Offer details";
    default:
      return slotId;
  }
}
