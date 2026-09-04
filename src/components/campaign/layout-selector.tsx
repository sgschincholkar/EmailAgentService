"use client";

import { LAYOUT_OPTIONS } from "@/domain/campaign-facts";
import type { LayoutId } from "@/domain/schemas";

type LayoutSelectorProps = {
  value: LayoutId;
  onChange: (layoutId: LayoutId) => void;
};

export function LayoutSelector({ value, onChange }: LayoutSelectorProps) {
  return (
    <div className="field">
      <span className="field-label">Choose a look for your email</span>
      <div className="layout-grid" role="radiogroup" aria-label="Email layout">
        {LAYOUT_OPTIONS.map((option) => (
          <label
            className={`layout-option${value === option.id ? " selected" : ""}`}
            key={option.id}
          >
            <input
              checked={value === option.id}
              name="layout"
              onChange={() => onChange(option.id)}
              type="radio"
              value={option.id}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
