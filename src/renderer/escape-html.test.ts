import { describe, expect, it } from "vitest";

import { escapeHtml, escapeHtmlWithLineBreaks } from "./escape-html";

describe("escapeHtml", () => {
  it("escapes all five reserved characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("escapes a script tag so it cannot execute", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });

  it("leaves ordinary text unchanged", () => {
    expect(escapeHtml("Save 20% off your first year")).toBe(
      "Save 20% off your first year",
    );
  });
});

describe("escapeHtmlWithLineBreaks", () => {
  it("escapes content and converts newlines to renderer-controlled <br> tags", () => {
    expect(escapeHtmlWithLineBreaks("Line one <b>bold</b>\nLine two")).toBe(
      "Line one &lt;b&gt;bold&lt;/b&gt;<br>Line two",
    );
  });

  it("handles CRLF and CR line endings", () => {
    expect(escapeHtmlWithLineBreaks("a\r\nb\rc")).toBe("a<br>b<br>c");
  });
});
