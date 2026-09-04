import type { EmailDocument, FooterEmailBlock } from "@/domain/schemas";

/**
 * Derives plain text sequentially from the same slot order the HTML
 * renderer uses. Deterministic: same input produces the same output.
 */
export function derivePlainText(doc: EmailDocument, footer: FooterEmailBlock): string {
  const lines: string[] = [doc.subject, "", doc.preheader, ""];

  for (const block of doc.blocks) {
    if (block.type === "footer") continue;

    if (block.type === "text") {
      lines.push(block.content, "");
    } else if (block.type === "button") {
      lines.push(`${block.label}: ${block.href}`, "");
    } else if (block.type === "image") {
      lines.push(block.altText, "");
    }
  }

  lines.push(footer.html);

  return lines.join("\n").trim();
}
