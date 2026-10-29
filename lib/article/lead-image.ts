/** Widest frame for an article lead image (landscape photos crop to this). */
const MAX_RATIO = 16 / 9;
/** Narrowest frame: square. Portrait images crop to 1:1 rather than run taller. */
const MIN_RATIO = 1;
/** Used when WordPress does not report the image's dimensions. */
const FALLBACK_RATIO = "16 / 10";

/**
 * CSS `aspect-ratio` for an article lead image: the image's own shape,
 * clamped between square and 16:9. Square posters with text (common for
 * event and campaign artwork) show whole instead of losing their top and
 * bottom to a fixed widescreen crop.
 */
export function leadImageAspectRatio(width?: number, height?: number): string {
  if (!width || !height || width <= 0 || height <= 0) return FALLBACK_RATIO;
  const ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, width / height));
  return `${Number(ratio.toFixed(4))}`;
}
