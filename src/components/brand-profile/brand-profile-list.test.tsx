import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BrandProfile } from "@/domain/schemas";

import { BrandProfileList } from "./brand-profile-list";

const profile: BrandProfile = {
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

describe("BrandProfileList", () => {
  it("offers a clear first action when no profiles exist", () => {
    render(<BrandProfileList profiles={[]} />);

    expect(screen.getByText("Make it feel like your brand")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Create brand profile" }).getAttribute("href")).toBe(
      "/brand-profiles/new",
    );
  });

  it("lists saved profiles with an edit path", () => {
    render(<BrandProfileList profiles={[profile]} />);

    expect(screen.getByText("Northstar Studio")).toBeTruthy();
    expect(screen.getByText("Warm")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Edit Northstar Studio" }).getAttribute("href")).toBe(
      "/brand-profiles/brand-1/edit",
    );
  });
});
