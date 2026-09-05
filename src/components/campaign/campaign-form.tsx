"use client";

import { useRef, useState, type FormEvent } from "react";

import { incompatibleFactKeysOnTypeChange } from "@/domain/campaign-facts";
import type { CampaignWithSegment } from "@/app/campaigns/actions";
import {
  CampaignFormInputSchema,
  type CampaignFormInput,
} from "@/domain/campaign-form-schema";
import type {
  Asset,
  BrandProfile,
  CampaignFacts,
  CampaignObjective,
  CampaignType,
  LayoutId,
} from "@/domain/schemas";

import { CampaignImagesField, type CampaignImageEntry } from "./campaign-images-field";
import { LayoutSelector } from "./layout-selector";
import { SegmentCardFields, type SegmentCardFormValues } from "./segment-card-fields";

type CampaignWithSegmentLike = CampaignWithSegment | undefined;

const IMAGE_REQUIRED_LAYOUTS: LayoutId[] = ["hero_cta", "promotion_offer"];

/**
 * Optional free-text fields (e.g. segment messaging notes) are stored as
 * `undefined` when empty — the schema requires optional strings to be
 * either absent or non-empty after trimming, never `""`. Centralized here
 * so every optional-field call site converts blank input the same way,
 * instead of relying on an inline `.trim() || undefined` at each site.
 */
function blankToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

type CampaignFormProps = {
  brandProfiles: BrandProfile[];
  initialCampaign?: CampaignWithSegmentLike;
  initialImages?: Asset[];
  onSave: (input: CampaignFormInput) => Promise<void>;
};

function assetsToImageEntries(assets: Asset[]): CampaignImageEntry[] {
  return assets.map((asset) => ({
    assetId: asset.id,
    previewUrl: `/api/assets/${asset.storageKey}`,
    altText: asset.altText ?? "",
  }));
}

const campaignTypeOptions: { value: CampaignType; label: string }[] = [
  { value: "announcement", label: "Announcement" },
  { value: "feature_launch", label: "Feature launch" },
  { value: "webinar", label: "Webinar" },
  { value: "promotion", label: "Promotion" },
  { value: "newsletter", label: "Newsletter" },
  { value: "activation", label: "Activation" },
  { value: "reactivation", label: "Reactivation" },
];

const objectiveOptions: { value: CampaignObjective; label: string }[] = [
  { value: "clicks", label: "Drive clicks" },
  { value: "registrations", label: "Drive registrations" },
  { value: "purchase", label: "Drive purchase" },
  { value: "activation", label: "Drive activation" },
  { value: "awareness", label: "Build awareness" },
];

type FactsFormValues = {
  productOrFeatureName: string;
  offerText: string;
  priceText: string;
  discountText: string;
  eligibilityText: string;
  startDateText: string;
  endDateText: string;
  eventDateText: string;
  eventTimeText: string;
  speakerText: string;
};

const BLANK_FACTS: FactsFormValues = {
  productOrFeatureName: "",
  offerText: "",
  priceText: "",
  discountText: "",
  eligibilityText: "",
  startDateText: "",
  endDateText: "",
  eventDateText: "",
  eventTimeText: "",
  speakerText: "",
};

function factsToFormValues(facts?: CampaignFacts): FactsFormValues {
  if (!facts) return { ...BLANK_FACTS };
  return {
    productOrFeatureName: facts.productOrFeatureName ?? "",
    offerText: facts.offerText ?? "",
    priceText: facts.priceText ?? "",
    discountText: facts.discountText ?? "",
    eligibilityText: facts.eligibilityText ?? "",
    startDateText: facts.startDateText ?? "",
    endDateText: facts.endDateText ?? "",
    eventDateText: facts.eventDateText ?? "",
    eventTimeText: facts.eventTimeText ?? "",
    speakerText: facts.speakerText ?? "",
  };
}

function populatedFactKeys(facts: FactsFormValues): string[] {
  return Object.entries(facts)
    .filter(([, value]) => value.trim().length > 0)
    .map(([key]) => key);
}

type FormErrors = Partial<
  Record<
    | "name"
    | "campaignType"
    | "objective"
    | "brief"
    | "ctaLabel"
    | "ctaUrl"
    | "segmentName"
    | "segmentMotivation"
    | "segmentObjection"
    | "segmentAction"
    | "images"
    | "form",
    string
  >
>;

/**
 * Maps each FormErrors key to the id of the field it belongs to, in the
 * same top-to-bottom order the fields appear in the form. Used to focus
 * the first invalid field after a failed submit and to build the
 * error-summary's jump links — kept as one ordered list so both stay in
 * sync with the actual visual order without duplicating it.
 */
const FIELD_ERROR_ORDER: Array<{ key: keyof FormErrors; fieldId: string; label: string }> = [
  { key: "name", fieldId: "campaign-name", label: "Campaign name" },
  { key: "brief", fieldId: "campaign-brief", label: "Campaign brief" },
  { key: "ctaLabel", fieldId: "cta-label", label: "Button label" },
  { key: "ctaUrl", fieldId: "cta-url", label: "Button destination URL" },
  { key: "images", fieldId: "campaign-images-upload", label: "Campaign images" },
  { key: "segmentName", fieldId: "segment-name", label: "Audience name" },
  { key: "segmentMotivation", fieldId: "segment-motivation", label: "Audience motivation" },
  { key: "segmentObjection", fieldId: "segment-objection", label: "Audience objection" },
  { key: "segmentAction", fieldId: "segment-action", label: "Desired action" },
];

export function CampaignForm({
  brandProfiles,
  initialCampaign,
  initialImages,
  onSave,
}: CampaignFormProps) {
  const [brandProfileId, setBrandProfileId] = useState(
    initialCampaign?.brandProfileId ?? brandProfiles[0]?.id ?? "",
  );
  const [name, setName] = useState(initialCampaign?.name ?? "");
  const [campaignType, setCampaignType] = useState<CampaignType>(
    initialCampaign?.campaignType ?? "announcement",
  );
  const [objective, setObjective] = useState<CampaignObjective>(
    initialCampaign?.objective ?? "awareness",
  );
  const [brief, setBrief] = useState(initialCampaign?.brief ?? "");
  const [ctaLabel, setCtaLabel] = useState(initialCampaign?.facts.ctaLabel ?? "");
  const [ctaUrl, setCtaUrl] = useState(initialCampaign?.facts.ctaUrl ?? "");
  const [selectedLayoutId, setSelectedLayoutId] = useState<LayoutId>(
    initialCampaign?.selectedLayoutId ?? "hero_cta",
  );
  const [facts, setFacts] = useState<FactsFormValues>(
    factsToFormValues(initialCampaign?.facts),
  );
  const [images, setImages] = useState<CampaignImageEntry[]>(
    assetsToImageEntries(initialImages ?? []),
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [segment, setSegment] = useState<SegmentCardFormValues>({
    name: initialCampaign?.segmentCard.name ?? "",
    lifecycleStage: initialCampaign?.segmentCard.lifecycleStage ?? "",
    primaryMotivation: initialCampaign?.segmentCard.primaryMotivation ?? "",
    primaryObjection: initialCampaign?.segmentCard.primaryObjection ?? "",
    desiredAction: initialCampaign?.segmentCard.desiredAction ?? "",
    messagingNotes: initialCampaign?.segmentCard.messagingNotes ?? "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [pendingTypeChange, setPendingTypeChange] = useState<{
    nextType: CampaignType;
    droppedKeys: string[];
  } | null>(null);

  function focusField(fieldId: string) {
    const field = formRef.current?.querySelector<HTMLElement>(`#${fieldId}`);
    field?.focus();
  }

  function focusFirstInvalidField(nextErrors: FormErrors) {
    const firstError = FIELD_ERROR_ORDER.find((entry) => nextErrors[entry.key]);
    if (!firstError) return;
    focusField(firstError.fieldId);
  }

  function applyTypeChange(nextType: CampaignType) {
    const droppedKeys = incompatibleFactKeysOnTypeChange(
      campaignType,
      nextType,
      populatedFactKeys(facts),
    );

    if (droppedKeys.length > 0) {
      setPendingTypeChange({ nextType, droppedKeys });
      return;
    }

    setCampaignType(nextType);
  }

  function confirmTypeChange() {
    if (!pendingTypeChange) return;
    const nextFacts = { ...facts };
    for (const key of pendingTypeChange.droppedKeys) {
      nextFacts[key as keyof FactsFormValues] = "";
    }
    setFacts(nextFacts);
    setCampaignType(pendingTypeChange.nextType);
    setPendingTypeChange(null);
  }

  function cancelTypeChange() {
    setPendingTypeChange(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    if (!name.trim()) nextErrors.name = "Name this campaign.";
    if (!brief.trim()) nextErrors.brief = "Tell us about this campaign.";
    if (!ctaLabel.trim()) nextErrors.ctaLabel = "Enter a button label.";
    if (!ctaUrl.trim()) nextErrors.ctaUrl = "Enter where the button should go.";
    if (!segment.name.trim()) nextErrors.segmentName = "Give this audience a name.";
    if (!segment.primaryMotivation.trim())
      nextErrors.segmentMotivation = "Tell us what matters most to them.";
    if (!segment.primaryObjection.trim())
      nextErrors.segmentObjection = "Tell us what might hold them back.";
    if (!segment.desiredAction.trim())
      nextErrors.segmentAction = "Tell us what you want them to do.";
    if (IMAGE_REQUIRED_LAYOUTS.includes(selectedLayoutId) && images.length === 0) {
      nextErrors.images = "Upload at least one image for this layout.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      focusFirstInvalidField(nextErrors);
      return;
    }

    const candidateFacts: CampaignFacts = {
      ctaLabel: ctaLabel.trim(),
      ctaUrl: ctaUrl.trim(),
      requiredClaims: initialCampaign?.facts.requiredClaims ?? [],
      requiredTerms: initialCampaign?.facts.requiredTerms ?? [],
      prohibitedClaims: initialCampaign?.facts.prohibitedClaims ?? [],
      ...(facts.productOrFeatureName.trim()
        ? { productOrFeatureName: facts.productOrFeatureName.trim() }
        : {}),
      ...(facts.offerText.trim() ? { offerText: facts.offerText.trim() } : {}),
      ...(facts.priceText.trim() ? { priceText: facts.priceText.trim() } : {}),
      ...(facts.discountText.trim()
        ? { discountText: facts.discountText.trim() }
        : {}),
      ...(facts.eligibilityText.trim()
        ? { eligibilityText: facts.eligibilityText.trim() }
        : {}),
      ...(facts.startDateText.trim()
        ? { startDateText: facts.startDateText.trim() }
        : {}),
      ...(facts.endDateText.trim() ? { endDateText: facts.endDateText.trim() } : {}),
      ...(facts.eventDateText.trim()
        ? { eventDateText: facts.eventDateText.trim() }
        : {}),
      ...(facts.eventTimeText.trim()
        ? { eventTimeText: facts.eventTimeText.trim() }
        : {}),
      ...(facts.speakerText.trim() ? { speakerText: facts.speakerText.trim() } : {}),
    };

    const candidate: CampaignFormInput = {
      id: initialCampaign?.id,
      brandProfileId,
      name: name.trim(),
      campaignType,
      objective,
      brief: brief.trim(),
      facts: candidateFacts,
      selectedLayoutId,
      images: images.map((image) => ({
        assetId: image.assetId,
        altText: image.altText.trim() || undefined,
      })),
      segmentCard: {
        name: segment.name.trim(),
        lifecycleStage: segment.lifecycleStage || undefined,
        primaryMotivation: segment.primaryMotivation.trim(),
        primaryObjection: segment.primaryObjection.trim(),
        desiredAction: segment.desiredAction.trim(),
        messagingNotes: blankToUndefined(segment.messagingNotes),
      },
    };

    const result = CampaignFormInputSchema.safeParse(candidate);
    if (!result.success) {
      setErrors({ form: "Check the highlighted details and try again." });
      return;
    }

    setErrors({});
    setSaveError(null);
    setSaving(true);
    try {
      await onSave(result.data);
    } catch {
      setSaveError(
        "We couldn't save this campaign. Your entries are still here — try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  const missingFactWarnings = getMissingFactWarnings(campaignType, facts);

  const activeFieldErrors = FIELD_ERROR_ORDER.filter((entry) => errors[entry.key]);

  return (
    <form className="campaign-form" noValidate onSubmit={handleSubmit} ref={formRef}>
      <div className="form-intro">
        <p className="eyebrow">Campaign setup</p>
        <h1>Tell us about your campaign</h1>
      </div>

      {activeFieldErrors.length > 0 ? (
        <div className="form-error-summary" role="alert">
          <p>Check the highlighted fields before saving:</p>
          <ul>
            {activeFieldErrors.map((entry) => (
              <li key={entry.key}>
                <button
                  className="text-link"
                  onClick={() => focusField(entry.fieldId)}
                  type="button"
                >
                  {entry.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="brand-profile">Brand profile</label>
        <select
          id="brand-profile"
          onChange={(event) => setBrandProfileId(event.target.value)}
          value={brandProfileId}
        >
          {brandProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="campaign-name">What are you sending?</label>
        <input
          aria-describedby={errors.name ? "campaign-name-error" : undefined}
          aria-invalid={Boolean(errors.name)}
          id="campaign-name"
          onChange={(event) => setName(event.target.value)}
          placeholder="For example: Spring feature launch"
          value={name}
        />
        {errors.name ? (
          <p className="field-error" id="campaign-name-error">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="campaign-type">Campaign type</label>
        <select
          id="campaign-type"
          onChange={(event) => applyTypeChange(event.target.value as CampaignType)}
          value={campaignType}
        >
          {campaignTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="campaign-objective">
          What do you want this email to achieve?
        </label>
        <select
          id="campaign-objective"
          onChange={(event) => setObjective(event.target.value as CampaignObjective)}
          value={objective}
        >
          {objectiveOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="campaign-brief">Tell us about this campaign</label>
        <textarea
          aria-describedby={errors.brief ? "campaign-brief-error" : undefined}
          aria-invalid={Boolean(errors.brief)}
          id="campaign-brief"
          onChange={(event) => setBrief(event.target.value)}
          placeholder="Give a short brief. What's happening, and why should this audience care?"
          rows={4}
          value={brief}
        />
        {errors.brief ? (
          <p className="field-error" id="campaign-brief-error">
            {errors.brief}
          </p>
        ) : null}
      </div>

      <div className="two-column-fields">
        <div className="field">
          <label htmlFor="cta-label">What should people do next?</label>
          <input
            aria-describedby={errors.ctaLabel ? "cta-label-error" : undefined}
            aria-invalid={Boolean(errors.ctaLabel)}
            id="cta-label"
            onChange={(event) => setCtaLabel(event.target.value)}
            placeholder="For example: Try it now"
            value={ctaLabel}
          />
          {errors.ctaLabel ? (
            <p className="field-error" id="cta-label-error">
              {errors.ctaLabel}
            </p>
          ) : null}
        </div>
        <div className="field">
          <label htmlFor="cta-url">Where should the button take them?</label>
          <input
            aria-describedby={errors.ctaUrl ? "cta-url-error" : undefined}
            aria-invalid={Boolean(errors.ctaUrl)}
            id="cta-url"
            onChange={(event) => setCtaUrl(event.target.value)}
            placeholder="https://example.com"
            value={ctaUrl}
          />
          {errors.ctaUrl ? (
            <p className="field-error" id="cta-url-error">
              {errors.ctaUrl}
            </p>
          ) : null}
        </div>
      </div>

      <LayoutSelector onChange={setSelectedLayoutId} value={selectedLayoutId} />

      <CampaignImagesField
        imageRequired={IMAGE_REQUIRED_LAYOUTS.includes(selectedLayoutId)}
        onChange={setImages}
        value={images}
      />
      {errors.images ? <p className="field-error">{errors.images}</p> : null}

      {campaignType === "webinar" ? (
        <div className="conditional-facts">
          <h2>Event details</h2>
          <div className="two-column-fields">
            <div className="field">
              <label htmlFor="event-date-time">Event date and time</label>
              <input
                id="event-date-time"
                onChange={(event) =>
                  setFacts((current) => ({
                    ...current,
                    eventDateText: event.target.value,
                  }))
                }
                placeholder="For example: March 12, 10am PT"
                value={facts.eventDateText}
              />
            </div>
            <div className="field">
              <label htmlFor="event-speaker">Speaker</label>
              <input
                id="event-speaker"
                onChange={(event) =>
                  setFacts((current) => ({
                    ...current,
                    speakerText: event.target.value,
                  }))
                }
                value={facts.speakerText}
              />
            </div>
          </div>
        </div>
      ) : null}

      {campaignType === "promotion" ? (
        <div className="conditional-facts">
          <h2>Offer details</h2>
          <div className="field">
            <label htmlFor="offer-text">Offer, discount, or price</label>
            <input
              id="offer-text"
              onChange={(event) =>
                setFacts((current) => ({ ...current, offerText: event.target.value }))
              }
              placeholder="For example: 20% off through March 31"
              value={facts.offerText}
            />
          </div>
        </div>
      ) : null}

      {campaignType === "feature_launch" || campaignType === "announcement" ? (
        <div className="conditional-facts">
          <h2>What are you announcing?</h2>
          <div className="field">
            <label htmlFor="product-name">Product or feature name</label>
            <input
              id="product-name"
              onChange={(event) =>
                setFacts((current) => ({
                  ...current,
                  productOrFeatureName: event.target.value,
                }))
              }
              value={facts.productOrFeatureName}
            />
          </div>
        </div>
      ) : null}

      {missingFactWarnings.length > 0 ? (
        <div className="fact-warning" role="status">
          {missingFactWarnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
          <p className="field-hint">
            You can still save this campaign as a draft and fill these in later.
          </p>
        </div>
      ) : null}

      <details className="more-details" open={advancedOpen} onToggle={(event) =>
        setAdvancedOpen((event.target as HTMLDetailsElement).open)
      }>
        <summary>Add optional details</summary>
        <div className="details-content">
          <div className="two-column-fields">
            <div className="field">
              <label htmlFor="start-date">Start date</label>
              <input
                id="start-date"
                onChange={(event) =>
                  setFacts((current) => ({
                    ...current,
                    startDateText: event.target.value,
                  }))
                }
                value={facts.startDateText}
              />
            </div>
            <div className="field">
              <label htmlFor="end-date">End date</label>
              <input
                id="end-date"
                onChange={(event) =>
                  setFacts((current) => ({
                    ...current,
                    endDateText: event.target.value,
                  }))
                }
                value={facts.endDateText}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="eligibility">Eligibility or terms</label>
            <textarea
              id="eligibility"
              onChange={(event) =>
                setFacts((current) => ({
                  ...current,
                  eligibilityText: event.target.value,
                }))
              }
              rows={2}
              value={facts.eligibilityText}
            />
          </div>
        </div>
      </details>

      <SegmentCardFields
        errors={{
          name: errors.segmentName,
          primaryMotivation: errors.segmentMotivation,
          primaryObjection: errors.segmentObjection,
          desiredAction: errors.segmentAction,
        }}
        onChange={setSegment}
        value={segment}
      />

      {errors.form ? <p className="form-error">{errors.form}</p> : null}
      {saveError ? <p className="form-error">{saveError}</p> : null}

      <div className="form-actions">
        <button className="button primary" disabled={saving} type="submit">
          {saving ? "Saving…" : "Save campaign"}
        </button>
      </div>

      {pendingTypeChange ? (
        <div aria-modal="true" className="modal-backdrop" role="dialog">
          <div className="modal">
            <h2>Switch campaign type?</h2>
            <p>
              Changing to this type will clear details that only apply to the
              current type. This can&apos;t be undone.
            </p>
            <div className="modal-actions">
              <button onClick={cancelTypeChange} type="button">
                Keep current type
              </button>
              <button
                className="button primary"
                onClick={confirmTypeChange}
                type="button"
              >
                Switch and clear those details
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function getMissingFactWarnings(
  campaignType: CampaignType,
  facts: FactsFormValues,
): string[] {
  const warnings: string[] = [];
  if (campaignType === "webinar") {
    if (!facts.eventDateText.trim()) warnings.push("Add the event date and time.");
    if (!facts.speakerText.trim()) warnings.push("Add a speaker.");
  }
  if (campaignType === "promotion" && !facts.offerText.trim()) {
    warnings.push("Add the offer, discount, or price.");
  }
  if (
    (campaignType === "feature_launch" || campaignType === "announcement") &&
    !facts.productOrFeatureName.trim()
  ) {
    warnings.push("Add the product or feature name.");
  }
  return warnings;
}
