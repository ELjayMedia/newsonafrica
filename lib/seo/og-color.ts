/**
 * HSL design-token → hex conversion for the OG image cards (NOA-115).
 *
 * `lib/design-tokens` stores colours as space-separated HSL channel triples
 * ("H S% L%") for CSS variables. Satori (next/og's renderer) mis-parses
 * hsl() with fractional components (e.g. the brand green
 * "142.1 76.2% 36.3%" renders black), so the OG cards convert tokens to
 * hex up front. Pure and unit-tested (`lib/seo/og-color.test.ts`).
 */

/** Convert an "H S% L%" token triple (e.g. "142.1 70.6% 45.3%") to "#rrggbb". */
export function hslChannelsToHex(channels: string): string {
  const match = channels.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!match) {
    throw new Error(`Invalid HSL channel triple: "${channels}" (expected "H S% L%")`);
  }

  const h = Number(match[1]) % 360;
  const s = Number(match[2]) / 100;
  const l = Number(match[3]) / 100;

  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const hPrime = h / 60;
  const x = chroma * (1 - Math.abs((hPrime % 2) - 1));
  const m = l - chroma / 2;

  let rgb: [number, number, number];
  if (hPrime < 1) rgb = [chroma, x, 0];
  else if (hPrime < 2) rgb = [x, chroma, 0];
  else if (hPrime < 3) rgb = [0, chroma, x];
  else if (hPrime < 4) rgb = [0, x, chroma];
  else if (hPrime < 5) rgb = [x, 0, chroma];
  else rgb = [chroma, 0, x];

  const toHex = (channel: number) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
}
