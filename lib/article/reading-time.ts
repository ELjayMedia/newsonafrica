/** Average adult silent-reading speed for news copy, in words per minute. */
const WORDS_PER_MINUTE = 200;

/** Word count of rendered article HTML (tags and `&nbsp;` treated as spaces). */
export function countWords(html: string): number {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Estimated reading time in whole minutes (minimum 1) for article HTML. */
export function estimateReadingMinutes(html: string): number {
  return Math.max(1, Math.ceil(countWords(html) / WORDS_PER_MINUTE));
}
