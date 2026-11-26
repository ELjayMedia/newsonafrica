import sharp from "sharp";

import { isSampleableImage, toHex } from "@/lib/ads/skin";
import { REVIVE_URL } from "@/lib/ads/zones";

export const runtime = "nodejs";

const MAX_BYTES = 3 * 1024 * 1024;

/**
 * Average colour along one edge of an ad-server image, for the takeover skin:
 * GET /api/ads/skin?src=<https://ads.eljaymedia.com/...>&edge=left|right
 * Only images on the Revive host are fetched. Responses are cached hard (an
 * image URL's pixels don't change).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get("src") ?? "";
  const edge = searchParams.get("edge") === "right" ? "right" : "left";
  if (!isSampleableImage(src, REVIVE_URL)) {
    return Response.json({ error: "unsupported image" }, { status: 400 });
  }

  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(5000) });
    const length = Number(res.headers.get("content-length") ?? 0);
    if (!res.ok || length > MAX_BYTES) return Response.json({ color: null }, { status: 200 });
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) return Response.json({ color: null }, { status: 200 });

    const image = sharp(buf, { limitInputPixels: 4_000_000 });
    const { width = 0, height = 0 } = await image.metadata();
    if (!width || !height) return Response.json({ color: null }, { status: 200 });
    const strip = Math.max(1, Math.round(width * 0.04));
    const { channels } = await image
      .clone()
      .extract({ left: edge === "left" ? 0 : width - strip, top: 0, width: strip, height })
      .stats();
    const [r, g, b, alpha] = channels.map((c) => c.mean);
    // A transparent edge has no colour to blend with: use the default skin.
    if (alpha !== undefined && alpha < 128) {
      return Response.json(
        { color: null },
        { headers: { "Cache-Control": "public, max-age=86400" } },
      );
    }
    return Response.json(
      { color: toHex(r ?? 0, g ?? 0, b ?? 0) },
      { headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable" } },
    );
  } catch {
    return Response.json({ color: null }, { status: 200 });
  }
}
