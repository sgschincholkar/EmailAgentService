const FALLBACK_SLUG = "campaign";

/**
 * Derives a safe, deterministic filename slug from a campaign name.
 * Never includes path separators or a user-supplied extension.
 */
export function slugifyCampaignName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || FALLBACK_SLUG;
}

export function buildEmailDownloadFilename(
  campaignName: string,
  documentVersion: number,
): string {
  const slug = slugifyCampaignName(campaignName);
  return `${slug}-email-v${documentVersion}.html`;
}
