"use client";

import { useState, type FormEvent } from "react";

import {
  BrandProfileSchema,
  type BrandProfile,
} from "@/domain/schemas";
import {
  DEFAULT_EMAIL_FONT_STACK,
  DEFAULT_FOOTER_HTML,
} from "@/domain/brand-profile-defaults";

import { ColorField } from "./color-field";
import { LogoUploadField } from "./logo-upload-field";
import { TermsListField } from "./terms-list-field";

const toneOptions = ["Warm", "Clear", "Confident", "Playful", "Direct"];

type BrandProfileFormProps = {
  initialProfile?: BrandProfile;
  onSave: (profile: BrandProfile) => void | Promise<void>;
};

type FormErrors = Partial<Record<"name" | "primary" | "tone" | "form", string>>;

export function BrandProfileForm({
  initialProfile,
  onSave,
}: BrandProfileFormProps) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [name, setName] = useState(initialProfile?.name ?? "");
  const [logoAssetId, setLogoAssetId] = useState(initialProfile?.logoAssetId);
  const [primary, setPrimary] = useState(initialProfile?.colors.primary ?? "");
  const [secondary, setSecondary] = useState(
    initialProfile?.colors.secondary ?? "",
  );
  const [accent, setAccent] = useState(initialProfile?.colors.accent ?? "");
  const [background, setBackground] = useState(
    initialProfile?.colors.background ?? "",
  );
  const [text, setText] = useState(initialProfile?.colors.text ?? "");
  const [tone, setTone] = useState<string[]>(initialProfile?.tone ?? []);
  const [voiceNotes, setVoiceNotes] = useState(
    initialProfile?.voiceNotes ?? "",
  );
  const [preferredFont, setPreferredFont] = useState(
    initialProfile?.preferredFont ?? "",
  );
  const [preferredTerms, setPreferredTerms] = useState(
    initialProfile?.preferredTerms ?? [],
  );
  const [prohibitedTerms, setProhibitedTerms] = useState(
    initialProfile?.prohibitedTerms ?? [],
  );
  const [defaultCtaStyle, setDefaultCtaStyle] = useState<"filled" | "outline">(
    initialProfile?.defaultCtaStyle ?? "filled",
  );
  const [customFooter, setCustomFooter] = useState(
    initialProfile?.defaultFooterHtml === DEFAULT_FOOTER_HTML
      ? ""
      : (initialProfile?.defaultFooterHtml ?? ""),
  );
  const [errors, setErrors] = useState<FormErrors>({});

  function toggleTone(option: string) {
    setTone((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    if (!name.trim()) nextErrors.name = "Enter your brand name.";
    if (!primary.trim()) nextErrors.primary = "Choose a primary color.";
    if (tone.length === 0) nextErrors.tone = "Choose at least one tone.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const now = new Date().toISOString();
    const candidate = {
      id: initialProfile?.id ?? crypto.randomUUID(),
      name: name.trim(),
      logoAssetId,
      colors: {
        primary: primary.trim(),
        ...(secondary.trim() ? { secondary: secondary.trim() } : {}),
        ...(accent.trim() ? { accent: accent.trim() } : {}),
        ...(background.trim() ? { background: background.trim() } : {}),
        ...(text.trim() ? { text: text.trim() } : {}),
      },
      ...(preferredFont.trim() ? { preferredFont: preferredFont.trim() } : {}),
      emailFontStack: initialProfile?.emailFontStack ?? DEFAULT_EMAIL_FONT_STACK,
      tone,
      ...(voiceNotes.trim() ? { voiceNotes: voiceNotes.trim() } : {}),
      preferredTerms,
      prohibitedTerms,
      defaultCtaStyle,
      defaultFooterHtml: customFooter.trim() || DEFAULT_FOOTER_HTML,
      createdAt: initialProfile?.createdAt ?? now,
      updatedAt: now,
    };

    const result = BrandProfileSchema.safeParse(candidate);
    if (!result.success) {
      const flattened = result.error.flatten().fieldErrors;
      setErrors({
        primary: flattened.colors?.[0],
        form: "Check the highlighted details and try again.",
      });
      return;
    }

    setErrors({});
    setSaveError(null);
    setSaving(true);
    try {
      await onSave(result.data);
    } catch {
      setSaveError(
        "We couldn't save this brand profile. Your entries are still here — try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="brand-form" noValidate onSubmit={handleSubmit}>
      <div className="form-intro">
        <p className="eyebrow">Brand profile</p>
        <h1>Make it feel like your brand</h1>
        <p>
          Give us the essentials now. You can add more detail whenever it is
          useful.
        </p>
      </div>

      <div className="field">
        <label htmlFor="brand-name">Brand name</label>
        <input
          aria-describedby={errors.name ? "brand-name-error" : undefined}
          aria-invalid={Boolean(errors.name)}
          id="brand-name"
          onChange={(event) => setName(event.target.value)}
          placeholder="Northstar Studio"
          value={name}
        />
        {errors.name ? (
          <p className="field-error" id="brand-name-error">
            {errors.name}
          </p>
        ) : null}
      </div>

      <LogoUploadField
        logoAssetId={logoAssetId}
        onUploaded={(assetId) => setLogoAssetId(assetId)}
      />

      <ColorField
        error={errors.primary}
        label="Primary color"
        name="primary-color"
        onChange={setPrimary}
        required
        value={primary}
      />

      <fieldset className="field tone-fieldset">
        <legend>Tone presets</legend>
        <div className="choice-row">
          {toneOptions.map((option) => (
            <label className="choice-chip" key={option}>
              <input
                checked={tone.includes(option)}
                onChange={() => toggleTone(option)}
                type="checkbox"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
        {errors.tone ? <p className="field-error">{errors.tone}</p> : null}
      </fieldset>

      <div className="field">
        <label htmlFor="voice-notes">Voice notes</label>
        <textarea
          id="voice-notes"
          onChange={(event) => setVoiceNotes(event.target.value)}
          placeholder="For example: friendly and practical, with short sentences."
          rows={4}
          value={voiceNotes}
        />
      </div>

      <details className="more-details">
        <summary>Add more brand details</summary>
        <div className="details-content">
          <div className="two-column-fields">
            <ColorField label="Secondary color" name="secondary-color" onChange={setSecondary} value={secondary} />
            <ColorField label="Accent color" name="accent-color" onChange={setAccent} value={accent} />
            <ColorField label="Background color" name="background-color" onChange={setBackground} value={background} />
            <ColorField label="Text color" name="text-color" onChange={setText} value={text} />
          </div>
          <div className="field">
            <label htmlFor="preferred-font">Preferred font</label>
            <input
              id="preferred-font"
              onChange={(event) => setPreferredFont(event.target.value)}
              placeholder="For example: Inter or Georgia"
              value={preferredFont}
            />
            <p className="field-hint">
              Use your preferred font as a visual reference. We’ll keep the email
              readable across inboxes.
            </p>
          </div>
          <TermsListField
            hint="For example: members, studio"
            label="Words to use"
            name="preferred-terms"
            onChange={setPreferredTerms}
            value={preferredTerms}
          />
          <TermsListField
            hint="For example: users, cheap"
            label="Words to avoid"
            name="prohibited-terms"
            onChange={setProhibitedTerms}
            value={prohibitedTerms}
          />
          <div className="field">
            <label htmlFor="button-style">Button style</label>
            <select
              id="button-style"
              onChange={(event) =>
                setDefaultCtaStyle(event.target.value as "filled" | "outline")
              }
              value={defaultCtaStyle}
            >
              <option value="filled">Filled</option>
              <option value="outline">Outline</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="email-footer">Email footer</label>
            <textarea
              id="email-footer"
              onChange={(event) => setCustomFooter(event.target.value)}
              placeholder="Leave blank to use the standard demo footer."
              rows={4}
              value={customFooter}
            />
          </div>
        </div>
      </details>

      {errors.form ? <p className="form-error">{errors.form}</p> : null}
      {saveError ? <p className="form-error">{saveError}</p> : null}
      <div className="form-actions">
        <button className="button primary" disabled={saving} type="submit">
          {saving ? "Saving…" : "Save brand profile"}
        </button>
      </div>
    </form>
  );
}
