import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ValidationResult } from "@/domain/schemas";

import { QuickChecks } from "./quick-checks";

const timestamp = "2026-09-04T06:00:00.000Z";

const errorResult: ValidationResult = {
  id: "v-1",
  severity: "error",
  code: "missing_cta",
  message: "The campaign has no CTA label.",
  createdAt: timestamp,
};

const warningResult: ValidationResult = {
  id: "v-2",
  severity: "warning",
  code: "missing_alt_text",
  message: "An image is missing descriptive alt text.",
  blockId: "hero_image",
  suggestedAction: "Add alt text to the image.",
  createdAt: timestamp,
};

describe("QuickChecks", () => {
  it("shows an accurate summary count", () => {
    render(<QuickChecks validationResults={[errorResult, warningResult]} />);
    expect(screen.getByText("1 error · 1 warning")).toBeTruthy();
  });

  it("distinguishes errors and warnings visually and textually", () => {
    render(<QuickChecks validationResults={[errorResult, warningResult]} />);
    expect(screen.getAllByText("error")).toHaveLength(1);
    expect(screen.getAllByText("warning")).toHaveLength(1);
  });

  it("shows each validation message", () => {
    render(<QuickChecks validationResults={[errorResult, warningResult]} />);
    expect(screen.getByText("The campaign has no CTA label.")).toBeTruthy();
    expect(screen.getByText("An image is missing descriptive alt text.")).toBeTruthy();
  });

  it("shows blockId and suggestedAction when present", () => {
    render(<QuickChecks validationResults={[warningResult]} />);
    expect(screen.getByText("Location: hero_image")).toBeTruthy();
    expect(screen.getByText("Add alt text to the image.")).toBeTruthy();
  });

  it("shows a clear empty state when there are no validation results", () => {
    render(<QuickChecks validationResults={[]} />);
    expect(screen.getByText("0 errors · 0 warnings")).toBeTruthy();
    expect(screen.getByText("No issues found for this draft.")).toBeTruthy();
  });
});
