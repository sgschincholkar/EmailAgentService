import { describe, expect, it } from "vitest";

import { demoBrandProfile } from "./fixtures/brand-profile";
import { resolveFooter } from "./resolve-footer";

describe("resolveFooter", () => {
  it("derives a non-editable footer from BrandProfile when no FooterEmailBlock exists", () => {
    const footer = resolveFooter([], demoBrandProfile);

    expect(footer.type).toBe("footer");
    expect(footer.html).toBe(demoBrandProfile.defaultFooterHtml);
    expect(footer.editable).toBe(false);
    expect(footer.lockedForVariants).toBe(true);
  });

  it("uses the EmailDocument's FooterEmailBlock when one is present", () => {
    const footer = resolveFooter(
      [
        {
          id: "footer",
          type: "footer",
          html: "Custom footer content",
          editable: false,
          lockedForVariants: true,
        },
      ],
      demoBrandProfile,
    );

    expect(footer.html).toBe("Custom footer content");
  });
});
