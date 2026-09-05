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

  it("focuses the first invalid field after a failed submit", () => {
    render(<CampaignForm brandProfiles={[brandProfile]} onSave={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Save campaign" }));

    expect(document.activeElement).toBe(screen.getByLabelText("What are you sending?"));
  });

  it("focuses the second field when only later fields are invalid", () => {
    render(<CampaignForm brandProfiles={[brandProfile]} onSave={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("What are you sending?"), {
      target: { value: "Spring launch" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save campaign" }));

    expect(document.activeElement).toBe(
      screen.getByLabelText("Tell us about this campaign"),
    );
  });

  it("shows an actionable role=alert error summary that jumps focus to the chosen field", () => {
    render(<CampaignForm brandProfiles={[brandProfile]} onSave={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Save campaign" }));

    const summary = screen.getByRole("alert");
    expect(summary.textContent).toContain("Check the highlighted fields before saving");

    fireEvent.click(screen.getByRole("button", { name: "Button label" }));
    expect(document.activeElement).toBe(screen.getByLabelText("What should people do next?"));
  });

  it("links each invalid field to its error message via aria-invalid and aria-describedby", () => {
    render(<CampaignForm brandProfiles={[brandProfile]} onSave={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Save campaign" }));

    const nameField = screen.getByLabelText("What are you sending?");
    expect(nameField.getAttribute("aria-invalid")).toBe("true");
    const describedBy = nameField.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)?.textContent).toBe(
      "Name this campaign.",
    );
  });

  it("does not mark valid fields as invalid", () => {
    render(<CampaignForm brandProfiles={[brandProfile]} onSave={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("What are you sending?"), {
      target: { value: "Spring launch" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save campaign" }));

    expect(screen.getByLabelText("What are you sending?").getAttribute("aria-invalid")).toBe(
      "false",
    );
  });

  function fillAllRequiredFields() {
    fireEvent.click(screen.getByRole("radio", { name: "Simple announcement" }));
    fireEvent.change(screen.getByLabelText("What are you sending?"), {
      target: { value: "Spring launch" },
    });
    fireEvent.change(screen.getByLabelText("Tell us about this campaign"), {
      target: { value: "A short brief." },
    });
    fireEvent.change(screen.getByLabelText("What should people do next?"), {
      target: { value: "Try it now" },
    });
    fireEvent.change(screen.getByLabelText("Where should the button take them?"), {
      target: { value: "https://example.com" },
    });
    fireEvent.change(screen.getByLabelText("Give this audience a name"), {
      target: { value: "Lapsed trial users" },
    });
    fireEvent.change(screen.getByLabelText("What matters most to them?"), {
      target: { value: "Getting value quickly" },
    });
    fireEvent.change(screen.getByLabelText("What might hold them back?"), {
      target: { value: "Not enough time" },
    });
    fireEvent.change(screen.getByLabelText("What do you want them to do?"), {
      target: { value: "Finish setup" },
    });
  }

  it("saves successfully with the optional messaging notes field left blank", () => {
    const onSave = vi.fn();
    render(<CampaignForm brandProfiles={[brandProfile]} onSave={onSave} />);

    fillAllRequiredFields();
    // Messaging notes deliberately left untouched — still empty.
    fireEvent.click(screen.getByRole("button", { name: "Save campaign" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const submitted = onSave.mock.calls[0][0];
    expect(submitted.segmentCard.messagingNotes).toBeUndefined();
  });

  it("saves successfully when messaging notes is typed then fully cleared", () => {
    const onSave = vi.fn();
    render(<CampaignForm brandProfiles={[brandProfile]} onSave={onSave} />);

    fillAllRequiredFields();
    const notesField = screen.getByLabelText("Anything else about this audience?");
    fireEvent.change(notesField, { target: { value: "Some notes" } });
    fireEvent.change(notesField, { target: { value: "" } });

    fireEvent.click(screen.getByRole("button", { name: "Save campaign" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const submitted = onSave.mock.calls[0][0];
    expect(submitted.segmentCard.messagingNotes).toBeUndefined();
  });

  it("saves successfully when messaging notes contains only whitespace", () => {
    const onSave = vi.fn();
    render(<CampaignForm brandProfiles={[brandProfile]} onSave={onSave} />);

    fillAllRequiredFields();
    fireEvent.change(screen.getByLabelText("Anything else about this audience?"), {
      target: { value: "   " },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save campaign" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const submitted = onSave.mock.calls[0][0];
    expect(submitted.segmentCard.messagingNotes).toBeUndefined();
  });

  it("preserves trimmed messaging notes content when non-empty", () => {
    const onSave = vi.fn();
    render(<CampaignForm brandProfiles={[brandProfile]} onSave={onSave} />);

    fillAllRequiredFields();
    fireEvent.change(screen.getByLabelText("Anything else about this audience?"), {
      target: { value: "  Keep this tone casual.  " },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save campaign" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const submitted = onSave.mock.calls[0][0];
    expect(submitted.segmentCard.messagingNotes).toBe("Keep this tone casual.");
  });

  it("never applies invalid ARIA wiring to the optional messaging notes field, blank or not", () => {
    render(<CampaignForm brandProfiles={[brandProfile]} onSave={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Save campaign" }));

    const notesField = screen.getByLabelText("Anything else about this audience?");
    expect(notesField.getAttribute("aria-invalid")).toBeNull();
    expect(notesField.getAttribute("aria-describedby")).toBeNull();
  });

  it("never includes messaging notes in the error summary, even when other required fields are missing", () => {
    render(<CampaignForm brandProfiles={[brandProfile]} onSave={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Save campaign" }));

    const summary = screen.getByRole("alert");
    expect(summary.textContent).not.toMatch(/messaging notes/i);
    expect(summary.textContent).not.toMatch(/anything else/i);
  });

  it("still shows the full error summary, field error, and focus behavior for a genuinely missing required field", () => {
    const onSave = vi.fn();
    render(<CampaignForm brandProfiles={[brandProfile]} onSave={onSave} />);

    fillAllRequiredFields();
    // Clear one required field back out after filling the rest.
    fireEvent.change(screen.getByLabelText("Give this audience a name"), {
      target: { value: "" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save campaign" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Give this audience a name.")).toBeTruthy();
    const summary = screen.getByRole("alert");
    expect(summary.textContent).toContain("Audience name");

    const nameField = screen.getByLabelText("Give this audience a name");
    expect(document.activeElement).toBe(nameField);
    expect(nameField.getAttribute("aria-invalid")).toBe("true");
    expect(nameField.getAttribute("aria-describedby")).toBeTruthy();
  });
});
