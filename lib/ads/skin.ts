/**
 * Takeover skin colours. The page gutters behind a takeover take their colour
 * from the advertiser's creative so the page blends into the ad:
 *
 * 1. `data-noa-skin="…"` anywhere in the creative (a colour, gradient or
 *    https image) wins: the trafficker's explicit choice.
 * 2. An image creative: the server samples the colour along its outer edge
 *    (/api/ads/skin).
 * 3. An HTML creative: its own root background.
 * 4. Otherwise the default dark skin.
 */
export const DEFAULT_SKIN =
  "radial-gradient(120% 80% at 50% 0%, #103b24 0%, #0c1410 60%, #080d0a 100%)";

const COLOR = String.raw`#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\)`;
const SAFE_COLOR = new RegExp(`^(?:${COLOR})$`, "i");
const SAFE_GRADIENT = new RegExp(
  String.raw`^(?:repeating-)?(?:linear|radial)-gradient\((?:[\w\s.,%#()-]|${COLOR})+\)$`,
  "i",
);
const SAFE_IMAGE = /^url\(\s*["']?https:\/\/[^"'()\s]+["']?\s*\)(?:\s+[\w\s%/-]+)?$/i;
const NAMED_COLOR = /^[a-z]{3,20}$/i;

/** Accept only colours, gradients and https images: never arbitrary CSS. */
export function safeSkinValue(value: string | null | undefined): string | null {
  const v = value?.trim().replace(/\s+/g, " ");
  if (!v || v.length > 400) return null;
  if (SAFE_COLOR.test(v) || NAMED_COLOR.test(v) || SAFE_GRADIENT.test(v) || SAFE_IMAGE.test(v))
    return v;
  return null;
}

const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&amp;/g, "&");

/** Explicit `data-noa-skin` value in the creative HTML. */
export function explicitSkin(html: string): string | null {
  const m = html.match(/data-noa-skin\s*=\s*(["'])(.*?)\1/i);
  return m ? safeSkinValue(decode(m[2]!)) : null;
}

/** The first inline background / background-color in the creative HTML. */
export function inlineBackground(html: string): string | null {
  const m = html.match(/style\s*=\s*(["'])(.*?)\1/i);
  if (!m) return null;
  const style = decode(m[2]!);
  const bg = style.match(/background(?:-color|-image)?\s*:\s*([^;]+)/i);
  return bg ? safeSkinValue(bg[1]) : null;
}

/** First image src in the creative (Revive image banners are <a><img></a>). */
export function firstImageSrc(html: string): string | null {
  const m = html.match(/<img[^>]+src\s*=\s*(["'])(https:\/\/[^"']+)\1/i);
  return m ? decode(m[2]!) : null;
}

export type SkinSource =
  { kind: "value"; value: string } | { kind: "image"; src: string } | { kind: "default" };

/** Decide how to colour a gutter for one creative. */
export function skinSourceFor(html: string): SkinSource {
  const explicit = explicitSkin(html);
  if (explicit) return { kind: "value", value: explicit };
  const img = firstImageSrc(html);
  if (img) return { kind: "image", src: img };
  const inline = inlineBackground(html);
  if (inline) return { kind: "value", value: inline };
  return { kind: "default" };
}

/** Only sample images the ad server itself hosts (no open image proxy). */
export function isSampleableImage(src: string, adServerUrl: string): boolean {
  try {
    const u = new URL(src);
    return u.protocol === "https:" && u.host === new URL(adServerUrl).host;
  } catch {
    return false;
  }
}

export function toHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((c) =>
        Math.max(0, Math.min(255, Math.round(c)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

export interface Wallpaper {
  /** CSS background for the whole page (image, gradient or colour). */
  background: string;
  /** The creative's image, if any: sampled for the fill colour around it. */
  image: string | null;
  /** Where a click on the visible wallpaper goes (Revive's click-tracking URL). */
  clickUrl: string | null;
}

/** First https link in the creative: Revive wraps banners in its click URL. */
export function firstLinkHref(html: string): string | null {
  const m = html.match(/<a[^>]+href\s*=\s*(["'])(https:\/\/[^"']+)\1/i);
  return m ? decode(m[2]!) : null;
}

/**
 * Wallpaper takeover from a creative. An image banner is shown at its real
 * size, centred at the top (never scaled, so the strip beside the page is
 * the same on every screen); an HTML creative can instead set `data-noa-skin`
 * or its own background. Null when the creative has nothing to paint.
 */
export function wallpaperFromCreative(html: string): Wallpaper | null {
  const explicit = explicitSkin(html);
  const img = firstImageSrc(html);
  const background =
    explicit ??
    (img ? safeSkinValue(`url("${img}") center top / auto no-repeat`) : null) ??
    inlineBackground(html);
  if (!background) return null;
  return { background, image: explicit ? null : img, clickUrl: firstLinkHref(html) };
}
