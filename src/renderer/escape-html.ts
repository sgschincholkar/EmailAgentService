const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPE_MAP[char]);
}

/**
 * Escapes text then converts newlines to renderer-controlled `<br>` tags.
 * Used for footer content, which must never be inserted as raw HTML.
 */
export function escapeHtmlWithLineBreaks(value: string): string {
  return escapeHtml(value).split(/\r\n|\r|\n/).join("<br>");
}
