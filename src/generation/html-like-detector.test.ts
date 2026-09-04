import { describe, expect, it } from "vitest";

import { containsHtmlLikeMarkup } from "./html-like-detector";

describe("containsHtmlLikeMarkup", () => {
  it("detects an HTML tag", () => {
    expect(containsHtmlLikeMarkup("<script>alert(1)</script>")).toBe(true);
    expect(containsHtmlLikeMarkup("Plain text <b>bold</b> text")).toBe(true);
  });

  it("detects an HTML comment", () => {
    expect(containsHtmlLikeMarkup("Text <!-- comment --> more text")).toBe(true);
  });

  it("detects a doctype declaration", () => {
    expect(containsHtmlLikeMarkup("<!doctype html>")).toBe(true);
  });

  it("does not flag ordinary comparison symbols", () => {
    expect(containsHtmlLikeMarkup("Save 20% off")).toBe(false);
    expect(containsHtmlLikeMarkup("Set up in <10 minutes")).toBe(false);
    expect(containsHtmlLikeMarkup("A > B and B < C")).toBe(false);
    expect(containsHtmlLikeMarkup("Revenue grew 3x > last quarter")).toBe(false);
  });
});
