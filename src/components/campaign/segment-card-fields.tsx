"use client";

import type { LifecycleStage } from "@/domain/schemas";

export type SegmentCardFormValues = {
  name: string;
  lifecycleStage: LifecycleStage | "";
  primaryMotivation: string;
  primaryObjection: string;
  desiredAction: string;
  messagingNotes: string;
};

const lifecycleOptions: { value: LifecycleStage; label: string }[] = [
  { value: "prospect", label: "Prospect" },
  { value: "trial", label: "Trial" },
  { value: "new_customer", label: "New customer" },
  { value: "active_customer", label: "Active customer" },
  { value: "lapsed_customer", label: "Lapsed customer" },
  { value: "vip", label: "VIP" },
];

type SegmentCardFieldsProps = {
  value: SegmentCardFormValues;
  onChange: (value: SegmentCardFormValues) => void;
  errors?: Partial<Record<keyof SegmentCardFormValues, string>>;
};

export function SegmentCardFields({
  value,
  onChange,
  errors,
}: SegmentCardFieldsProps) {
  function set<K extends keyof SegmentCardFormValues>(
    key: K,
    fieldValue: SegmentCardFormValues[K],
  ) {
    onChange({ ...value, [key]: fieldValue });
  }

  return (
    <fieldset className="segment-fields">
      <legend>Who is this email for?</legend>

      <div className="field">
        <label htmlFor="segment-name">Give this audience a name</label>
        <input
          aria-describedby={errors?.name ? "segment-name-error" : undefined}
          aria-invalid={Boolean(errors?.name)}
          id="segment-name"
          onChange={(event) => set("name", event.target.value)}
          placeholder="For example: Lapsed trial users"
          value={value.name}
        />
        {errors?.name ? (
          <p className="field-error" id="segment-name-error">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="segment-lifecycle">Where are they in their journey?</label>
        <select
          id="segment-lifecycle"
          onChange={(event) =>
            set("lifecycleStage", event.target.value as LifecycleStage | "")
          }
          value={value.lifecycleStage}
        >
          <option value="">Not specified</option>
          {lifecycleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="segment-motivation">What matters most to them?</label>
        <textarea
          aria-describedby={errors?.primaryMotivation ? "segment-motivation-error" : undefined}
          aria-invalid={Boolean(errors?.primaryMotivation)}
          id="segment-motivation"
          onChange={(event) => set("primaryMotivation", event.target.value)}
          placeholder="For example: Getting their team onboarded quickly"
          rows={2}
          value={value.primaryMotivation}
        />
        {errors?.primaryMotivation ? (
          <p className="field-error" id="segment-motivation-error">
            {errors.primaryMotivation}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="segment-objection">What might hold them back?</label>
        <textarea
          aria-describedby={errors?.primaryObjection ? "segment-objection-error" : undefined}
          aria-invalid={Boolean(errors?.primaryObjection)}
          id="segment-objection"
          onChange={(event) => set("primaryObjection", event.target.value)}
          placeholder="For example: Worried it will take too long to set up"
          rows={2}
          value={value.primaryObjection}
        />
        {errors?.primaryObjection ? (
          <p className="field-error" id="segment-objection-error">
            {errors.primaryObjection}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="segment-action">What do you want them to do?</label>
        <input
          aria-describedby={errors?.desiredAction ? "segment-action-error" : undefined}
          aria-invalid={Boolean(errors?.desiredAction)}
          id="segment-action"
          onChange={(event) => set("desiredAction", event.target.value)}
          placeholder="For example: Finish setting up their workspace"
          value={value.desiredAction}
        />
        {errors?.desiredAction ? (
          <p className="field-error" id="segment-action-error">
            {errors.desiredAction}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="segment-notes">Anything else about this audience?</label>
        <textarea
          id="segment-notes"
          onChange={(event) => set("messagingNotes", event.target.value)}
          placeholder="Optional messaging notes"
          rows={2}
          value={value.messagingNotes}
        />
      </div>
    </fieldset>
  );
}
