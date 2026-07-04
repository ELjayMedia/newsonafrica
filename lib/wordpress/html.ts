/**
 * Small HTML helpers for normalizing WordPress `rendered` fields (title,
 * excerpt, content), shared by the DAL (NOA-86) and content-sync (NOA-87).
 *
 * Ported from the legacy app's `lib/utils/decodeHtmlEntities.ts` +
 * `lib/search.ts` (`stripHtml`).
 */

const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const STYLE_TAG_REGEX = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi;
const TAG_REGEX = /<[^>]+>/g;
const ENTITY_PATTERN = /&(#(?:x[a-fA-F0-9]+|[0-9]+)|[a-zA-Z]+);/g;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Decode numeric and the common named HTML entities WordPress emits. */
export function decodeHtmlEntities(value: string): string {
  if (!value) return "";

  return value.replace(ENTITY_PATTERN, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const codePoint = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (entity.startsWith("#")) {
      const codePoint = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    const mapped = NAMED_ENTITIES[entity];
    return typeof mapped === "string" ? mapped : match;
  });
}

/** Strip HTML tags (including script/style contents) and decode entities. */
export function stripHtml(html: string): string {
  if (!html) return "";

  const withoutDangerousTags = html.replace(SCRIPT_TAG_REGEX, " ").replace(STYLE_TAG_REGEX, " ");
  const withoutTags = withoutDangerousTags.replace(TAG_REGEX, " ");
  const decoded = decodeHtmlEntities(withoutTags);

  return decoded.replace(/\s+/g, " ").trim();
}
