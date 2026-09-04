import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BrandProfileForm } from "./brand-profile-form";

describe("BrandProfileForm", () => {
  it("shows only the five essential inputs before details are expanded", () => {
    render(<BrandProfileForm onSave={vi.fn()} />);

    expect(screen.getByLabelText("Brand name")).toBeTruthy();
    expect(screen.getByText("Logo upload")).toBeTruthy();
    expect(screen.getByLabelText("Primary color")).toBeTruthy();
    expect(screen.getByText("Tone presets")).toBeTruthy();
    expect(screen.getByLabelText("Voice notes")).toBeTruthy();
    const disclosure = screen.getByText("Add more brand details").closest("details");
    expect(disclosure?.hasAttribute("open")).toBe(false);
    expect(screen.getByLabelText("Preferred font").closest("details")).toBe(disclosure);
    expect(screen.getByLabelText("Email footer").closest("details")).toBe(disclosure);
  });

  it("reveals optional fields through Add more brand details", () => {
    render(<BrandProfileForm onSave={vi.fn()} />);

    fireEvent.click(screen.getByText("Add more brand details"));

    expect(screen.getByLabelText("Secondary color")).toBeTruthy();
    expect(screen.getByLabelText("Accent color")).toBeTruthy();
    expect(screen.getByLabelText("Background color")).toBeTruthy();
    expect(screen.getByLabelText("Text color")).toBeTruthy();
    expect(screen.getByLabelText("Preferred font")).toBeTruthy();
    expect(screen.getByLabelText("Words to use")).toBeTruthy();
    expect(screen.getByLabelText("Words to avoid")).toBeTruthy();
    expect(screen.getByLabelText("Button style")).toBeTruthy();
    expect(screen.getByLabelText("Email footer")).toBeTruthy();
  });

  it("shows plain-language errors for missing required inputs", () => {
    render(<BrandProfileForm onSave={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Save brand profile" }));

    expect(screen.getByText("Enter your brand name.")).toBeTruthy();
    expect(screen.getByText("Choose a primary color.")).toBeTruthy();
    expect(screen.getByText("Choose at least one tone.")).toBeTruthy();
  });

  it("saves a valid profile with resolved system defaults", () => {
    const onSave = vi.fn();
    render(<BrandProfileForm onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Brand name"), {
      target: { value: "Northstar Studio" },
    });
    fireEvent.change(screen.getByLabelText("Primary color"), {
      target: { value: "#285E61" },
    });
    fireEvent.click(screen.getByLabelText("Warm"));
    fireEvent.click(screen.getByRole("button", { name: "Save brand profile" }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({
      name: "Northstar Studio",
      colors: { primary: "#285E61" },
      tone: ["Warm"],
      defaultCtaStyle: "filled",
    });
    expect(onSave.mock.calls[0][0].defaultFooterHtml).toBeTruthy();
  });

  it("rejects an invalid hex color", () => {
    const onSave = vi.fn();
    render(<BrandProfileForm onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Brand name"), {
      target: { value: "Northstar Studio" },
    });
    fireEvent.change(screen.getByLabelText("Primary color"), {
      target: { value: "notacolor" },
    });
    fireEvent.click(screen.getByLabelText("Warm"));
    fireEvent.click(screen.getByRole("button", { name: "Save brand profile" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Color must be a six-digit hex value, such as #285E61.")).toBeTruthy();
  });

  it("adds and removes preferred terms in the submitted profile", () => {
    const onSave = vi.fn();
    render(<BrandProfileForm onSave={onSave} />);

    fireEvent.click(screen.getByText("Add more brand details"));
    fireEvent.change(screen.getByLabelText("Words to use"), {
      target: { value: "workspace, members" },
    });
    fireEvent.change(screen.getByLabelText("Words to use"), {
      target: { value: "members" },
    });
    fireEvent.change(screen.getByLabelText("Brand name"), {
      target: { value: "Northstar Studio" },
    });
    fireEvent.change(screen.getByLabelText("Primary color"), {
      target: { value: "#285E61" },
    });
    fireEvent.click(screen.getByLabelText("Warm"));
    fireEvent.click(screen.getByRole("button", { name: "Save brand profile" }));

    expect(onSave.mock.calls[0][0].preferredTerms).toEqual(["members"]);
  });
});
