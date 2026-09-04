import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BrandProfile } from "@/domain/schemas";

import { CampaignForm } from "./campaign-form";

const brandProfile: BrandProfile = {
  id: "brand-1",
  name: "Northstar Studio",
  colors: { primary: "#285E61" },
  emailFontStack: "Arial, Helvetica, sans-serif",
  tone: ["Warm"],
  preferredTerms: [],
  prohibitedTerms: [],
  defaultCtaStyle: "filled",
  defaultFooterHtml: "Demo footer",
  createdAt: "2026-09-04T06:00:00.000Z",
  updatedAt: "2026-09-04T06:00:00.000Z",
};

describe("CampaignForm", () => {
  it("shows friendly layout labels with no internal layout ids", () => {
    render(<CampaignForm brandProfiles={[brandProfile]} onSave={vi.fn()} />);

    expect(screen.getByText("Visual spotlight")).toBeTruthy();
    expect(screen.getByText("Event invitation")).toBeTruthy();
    expect(screen.getByText("Simple announcement")).toBeTruthy();
    expect(screen.getByText("Offer highlight")).toBeTruthy();
    expect(screen.queryByText("hero_cta")).toBeNull();
    expect(screen.queryByText("webinar_event")).toBeNull();
  });

  it("hides conditional facts by default and reveals them for the selected type", () => {
    render(<CampaignForm brandProfiles={[brandProfile]} onSave={vi.fn()} />);

    expect(screen.queryByLabelText("Event date and time")).toBeNull();

    fireEvent.change(screen.getByLabelText("Campaign type"), {
      target: { value: "webinar" },
    });

    expect(screen.getByLabelText("Event date and time")).toBeTruthy();
    expect(screen.getByLabelText("Speaker")).toBeTruthy();
  });

  it("keeps the advanced section collapsed by default", () => {
    render(<CampaignForm brandProfiles={[brandProfile]} onSave={vi.fn()} />);

    const disclosure = screen.getByText("Add optional details").closest("details");
    expect(disclosure?.hasAttribute("open")).toBe(false);
  });

  it("requires core fields and segment card fields before saving", () => {
    const onSave = vi.fn();
    render(<CampaignForm brandProfiles={[brandProfile]} onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: "Save campaign" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Name this campaign.")).toBeTruthy();
    expect(screen.getByText("Tell us about this campaign.")).toBeTruthy();
    expect(screen.getByText("Enter a button label.")).toBeTruthy();
    expect(screen.getByText("Give this audience a name.")).toBeTruthy();
  });

  it("confirms before clearing populated facts on an incompatible type change", () => {
    render(<CampaignForm brandProfiles={[brandProfile]} onSave={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Campaign type"), {
      target: { value: "webinar" },
    });
    fireEvent.change(screen.getByLabelText("Event date and time"), {
      target: { value: "October 3, 2026" },
    });

    fireEvent.change(screen.getByLabelText("Campaign type"), {
      target: { value: "promotion" },
    });

    expect(screen.getByText("Switch campaign type?")).toBeTruthy();
    // Type has not switched yet — still webinar until confirmed.
    expect(screen.getByLabelText("Event date and time")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Switch and clear those details" }),
    );

    expect(screen.queryByText("Switch campaign type?")).toBeNull();
    expect(screen.getByLabelText("Offer, discount, or price")).toBeTruthy();
  });

  it("requires an image for Visual spotlight and Offer highlight but not the other layouts", () => {
    const onSave = vi.fn();
    render(<CampaignForm brandProfiles={[brandProfile]} onSave={onSave} />);

    // Default layout is Visual spotlight (hero_cta) — image required.
    fireEvent.click(screen.getByRole("button", { name: "Save campaign" }));
    expect(screen.getByText("Upload at least one image for this layout.")).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: "Simple announcement" }));
    fireEvent.click(screen.getByRole("button", { name: "Save campaign" }));
    expect(
      screen.queryByText("Upload at least one image for this layout."),
    ).toBeNull();
  });
});
