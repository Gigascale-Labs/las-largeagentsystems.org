/**
 * Text cleaning for anything that arrives from outside this site: what a
 * submitter types, and what the server reads back from a third-party page.
 *
 * React escapes on render, so this is not the XSS defence -- it stops junk from
 * being *stored*. Once a value is in Airtable it is read by a human reviewer,
 * copied into the canon, and exported to CSV, and none of those places escape
 * anything.
 */

/**
 * Characters that render as nothing but are still read by whatever consumes the
 * text: zero-width spaces, bidirectional overrides that can reverse how a title
 * displays, and the Unicode Tags block, which hides instructions inside text
 * that looks ordinary.
 */
const INVISIBLE =
  /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]|[\u{E0000}-\u{E007F}]/gu;

/** C0 and C1 control codes, except tab and newline. */
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/** Decode the entities that appear in page titles, then drop any markup. */
export function decodeAndStripTags(value: string): string {
  const decoded = value.replace(
    /&(?:amp|lt|gt|quot|#39|apos|nbsp);/g,
    (entity) => HTML_ENTITIES[entity] ?? entity,
  );
  // Decoding turns "&lt;script&gt;" back into a real tag, so tags are stripped
  // after decoding, never before.
  return decoded.replace(/<[^>]*>/g, " ");
}

/**
 * Clean a value for storage: no invisible or control characters, single spaces,
 * trimmed, and no longer than `maxChars`.
 */
export function sanitizeText(
  value: string | null | undefined,
  maxChars: number,
): string {
  if (!value) return "";
  const cleaned = value
    .replace(INVISIBLE, "")
    .replace(CONTROL, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > maxChars
    ? `${cleaned.slice(0, maxChars).trimEnd()}...`
    : cleaned;
}

/** Clean a value that arrived as HTML: strip the markup first. */
export function sanitizeHtmlText(
  value: string | null | undefined,
  maxChars: number,
): string {
  if (!value) return "";
  return sanitizeText(decodeAndStripTags(value), maxChars);
}

/** Length limits for one Pending Queue submission. */
export const FIELD_LIMITS = {
  url: 2048,
  title: 500,
  creators: 1000,
  date: 20,
  summary: 4000,
  submittedBy: 200,
  note: 2000,
} as const;
