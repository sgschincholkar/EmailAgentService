/**
 * Detects HTML-like markup (tags, comments, doctype) without rejecting
 * plain comparison symbols ("Save 20% off", "<10 min setup", "A/B > C").
 * The renderer still HTML-escapes all text as defense in depth — this
 * check exists to catch a model attempting to emit real markup, not to
 * ban the '<' and '>' characters outright.
 */
const HTML_LIKE_PATTERN = /<\/?[a-z][^>]*>|<!--|<!doctype/i;

export function containsHtmlLikeMarkup(value: string): boolean {
  return HTML_LIKE_PATTERN.test(value);
}
