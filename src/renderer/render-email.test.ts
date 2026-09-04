import { describe, expect, it } from "vitest";

import type { EmailDocument } from "@/domain/schemas";

import { demoBrandProfile } from "./fixtures/brand-profile";
import { resolveFixtureAssetUrl } from "./fixtures/asset-resolver";
import { heroCtaFixture } from "./fixtures/hero-cta-document";
import { promotionOfferFixture } from "./fixtures/promotion-offer-document";
import { textAnnouncementFixture } from "./fixtures/text-announcement-document";
import { webinarEventFixture } from "./fixtures/webinar-event-document";
import { RenderError } from "./render-error";
import { renderEmail } from "./render-email";

const fixtures = [
  { name: "hero_cta", doc: heroCtaFixture, requiresImage: true },
  { name: "webinar_event", doc: webinarEventFixture, requiresImage: false },
  { name: "text_announcement", doc: textAnnouncementFixture, requiresImage: false },
  { name: "promotion_offer", doc: promotionOfferFixture, requiresImage: true },
];

function render(doc: EmailDocument) {
  return renderEmail(doc, demoBrandProfile, {
    resolveAssetUrl: resolveFixtureAssetUrl,
  });
}

describe("renderEmail", () => {
  it.each(fixtures)("renders non-empty HTML and plain text for $name", ({ doc }) => {
    const result = render(doc);
    expect(result.html.length).toBeGreaterThan(0);
    expect(result.plainText.length).toBeGreaterThan(0);
  });

  it.each(fixtures)("is a pure function for $name (deterministic)", ({ doc }) => {
    const first = render(doc);
    const second = render(doc);
    expect(first).toEqual(second);
  });

  it.each(fixtures)("uses a table-based layout with inline CSS for $name", ({ doc }) => {
    const { html } = render(doc);
    expect(html).toContain("<table");
    expect(html).not.toContain("<div");
    expect(html).toMatch(/style="/);
  });

  it.each(fixtures)("keeps the outer table full width and the inner table capped at 600px for $name", ({ doc }) => {
    const { html } = render(doc);
    expect(html).toContain('width="100%"');
    expect(html).toContain("max-width:600px");
  });

  it.each(fixtures)("brand primary color appears in the CTA and headline for $name", ({ doc }) => {
    const { html } = render(doc);
    const occurrences = html.split(demoBrandProfile.colors.primary).length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it.each(fixtures.filter((f) => f.requiresImage))(
    "renders required hero image with fluid sizing and alt text for $name",
    ({ doc }) => {
      const { html } = render(doc);
      expect(html).toContain('style="display:block; width:100%; height:auto;');
      expect(html).toMatch(/alt="[^"]+"/);
    },
  );

  it("omits the optional hero image for webinar_event when not supplied", () => {
    const { html } = render(webinarEventFixture);
    expect(html).not.toContain("fixture-asset-hero");
  });

  it("escapes ampersands and angle brackets present in fixture body text", () => {
    const { html } = render(heroCtaFixture);
    expect(html).toContain("projects, conversations &amp; files");
    expect(html).toContain("&lt;context switching&gt;");
    expect(html).not.toContain("<context switching>");
  });

  it("never inserts footer content as raw HTML, even though the field is named html", () => {
    const { html } = render(heroCtaFixture);
    expect(html).toContain("Northstar Studio, 123 Market St, Suite 400<br>");
    expect(html).not.toContain("<Northstar");
  });

  it("throws a typed RenderError with slotId when a required slot is missing", () => {
    const broken: EmailDocument = {
      ...heroCtaFixture,
      blocks: heroCtaFixture.blocks.filter((block) => block.id !== "cta"),
    };

    try {
      render(broken);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RenderError);
      const renderError = error as RenderError;
      expect(renderError.code).toBe("missing_required_block");
      expect(renderError.slotId).toBe("cta");
    }
  });

  it("throws a typed RenderError when a button URL is unsafe", () => {
    const broken: EmailDocument = {
      ...heroCtaFixture,
      blocks: heroCtaFixture.blocks.map((block) =>
        block.id === "cta" && block.type === "button"
          ? { ...block, href: "javascript:alert(1)" }
          : block,
      ),
    };

    try {
      render(broken);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RenderError);
      expect((error as RenderError).code).toBe("unsafe_asset_url");
    }
  });

  it("plain text contains no HTML tags", () => {
    // Fixture body copy deliberately includes literal "<context switching>"
    // text to prove HTML escaping elsewhere, so this checks for actual
    // markup tags (e.g. <br>, <table>) rather than any bracket pair.
    const knownTags = /<(br|table|tr|td|html|body|head|title|a|img)\b[^>]*>/i;
    for (const fixture of fixtures) {
      const { plainText } = render(fixture.doc);
      expect(plainText).not.toMatch(knownTags);
    }
  });

  it("plain text includes subject, headline, body, and CTA URL", () => {
    const { plainText } = render(heroCtaFixture);
    expect(plainText).toContain(heroCtaFixture.subject);
    expect(plainText).toContain("Your team's new home base");
    expect(plainText).toContain("app.northstar.example/workspaces");
  });

  it("plain text includes the footer content", () => {
    const { plainText } = render(heroCtaFixture);
    expect(plainText).toContain("Northstar Studio, 123 Market St, Suite 400");
  });

  it("footer renders in all four layouts", () => {
    for (const fixture of fixtures) {
      const { html } = render(fixture.doc);
      expect(html).toContain("Northstar Studio, 123 Market St, Suite 400");
    }
  });

  it("renders a controlled <br> for multiline event_details", () => {
    const { html } = render(webinarEventFixture);
    expect(html).toContain(
      "October 3, 2026 · 10:00 AM ET<br>Speaker: Avery Chen, Head of Product<br>",
    );
  });

  it("renders a controlled <br> for multiline offer_details", () => {
    const { html } = render(promotionOfferFixture);
    expect(html).toContain(
      "20% off your first year<br>Offer ends September 30, 2026<br>",
    );
  });

  it("escapes HTML-looking content in event_details even when split across lines", () => {
    const { html } = render(webinarEventFixture);
    expect(html).toContain("&lt;Registration required&gt;");
    expect(html).not.toContain("<Registration required>");
  });

  it("escapes HTML-looking content in offer_details even when split across lines", () => {
    const { html } = render(promotionOfferFixture);
    expect(html).toContain("&lt;New customers only&gt;");
    expect(html).not.toContain("<New customers only>");
  });

  it("keeps a <script> tag literal-escaped even when split across lines", () => {
    const broken: EmailDocument = {
      ...heroCtaFixture,
      blocks: heroCtaFixture.blocks.map((block) =>
        block.id === "body" && block.type === "text"
          ? { ...block, content: "line one\n<script>alert(1)</script>\nline three" }
          : block,
      ),
    };

    const { html } = render(broken);
    expect(html).toContain("line one<br>&lt;script&gt;alert(1)&lt;/script&gt;<br>line three");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("plain text preserves source line breaks for event_details and offer_details", () => {
    const webinarText = render(webinarEventFixture).plainText;
    expect(webinarText).toContain(
      "October 3, 2026 · 10:00 AM ET\nSpeaker: Avery Chen, Head of Product\n<Registration required>",
    );

    const promotionText = render(promotionOfferFixture).plainText;
    expect(promotionText).toContain(
      "20% off your first year\nOffer ends September 30, 2026\n<New customers only>",
    );
  });
});
