/**
 * WordPress webhook (NOA-88): on publish/update/delete, revalidate the
 * relevant Next.js fetch-cache tags and sync the content index.
 *
 * WordPress should call this via a plugin (e.g. a `save_post` /
 * `before_delete_post` hook posting JSON) with:
 *   { "action": "post_published" | "post_updated" | "post_deleted" | "category_updated",
 *     "country": "sz" | "za" | "ng",
 *     "post": { "id": number, "slug": string, "categorySlugs"?: string[], "tagSlugs"?: string[] } }
 *
 * Auth: either header `x-webhook-secret: <WORDPRESS_WEBHOOK_SECRET>`, or an
 * HMAC-SHA256 signature of the raw body in `x-wp-signature: sha256=<hex>`
 * (optionally prefixed `sha256=`), keyed with the same secret.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/lib/env";
import { createLogger } from "@/lib/log";
import { getMetrics } from "@/lib/metrics";
import { cacheTags } from "@/lib/wordpress/cache-tags";
import { isValidCountry, SUPPORTED_COUNTRY_CODES } from "@/lib/wordpress/countries";
import { normalizeWpPostId } from "@/lib/wordpress/wp-post-id";
import { deletePostFromIndex, syncPostById } from "@/lib/content-sync/sync";

const log = createLogger("webhook:wordpress");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WordPressWebhookPost {
  id?: number | string;
  slug?: string;
  categorySlugs?: string[];
  tagSlugs?: string[];
  authorSlug?: string;
}

interface WordPressWebhookPayload {
  action?: "post_published" | "post_updated" | "post_deleted" | "category_updated" | "tag_updated" | string;
  country?: string;
  post?: WordPressWebhookPost;
}

function readWebhookSecret(): string | null {
  const secret = serverEnv.WORDPRESS_WEBHOOK_SECRET?.trim();
  return secret ? secret : null;
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

function verifySignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  const provided = signatureHeader.replace(/^sha256=/i, "").trim();
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(provided, expected);
}

function isAuthorized(request: NextRequest, rawBody: string): boolean {
  const webhookSecret = readWebhookSecret();
  if (!webhookSecret) return false;

  const secretHeader = request.headers.get("x-webhook-secret")?.trim();
  if (secretHeader) {
    return safeEqual(secretHeader, webhookSecret);
  }

  const signatureHeader = request.headers.get("x-wp-signature")?.trim();
  if (signatureHeader) {
    return verifySignature(rawBody, signatureHeader, webhookSecret);
  }

  return false;
}

function normalizeCountry(country: string | undefined): string[] {
  if (country && isValidCountry(country.trim().toLowerCase())) {
    return [country.trim().toLowerCase()];
  }
  // Unknown/missing country: be conservative and revalidate every edition
  // rather than silently leaving stale pages cached.
  return Array.from(SUPPORTED_COUNTRY_CODES);
}

/**
 * Revalidate every fetch-cache tag a changed post could affect, across the
 * resolved countries. See docs/caching-strategy.md for what each tag covers.
 */
function revalidatePost(countries: string[], post: WordPressWebhookPost) {
  const postId = post.id !== undefined ? String(post.id) : undefined;
  const tags = new Set<string>();

  for (const country of countries) {
    tags.add(cacheTags.country(country));
    tags.add(cacheTags.home(country));
    tags.add(cacheTags.posts(country));

    if (postId) tags.add(cacheTags.post(country, postId));
    if (post.slug) tags.add(cacheTags.postSlug(country, post.slug));

    for (const slug of post.categorySlugs ?? []) {
      tags.add(cacheTags.category(country, slug));
    }
    for (const slug of post.tagSlugs ?? []) {
      tags.add(cacheTags.tag(country, slug));
    }
    if (post.authorSlug) tags.add(cacheTags.author(country, post.authorSlug));
  }

  for (const tag of tags) {
    revalidateTag(tag);
  }

  return Array.from(tags);
}

function revalidateTaxonomy(countries: string[], kind: "category" | "tag", slug: string | undefined) {
  if (!slug) return [];

  const tags = countries.map((country) => (kind === "category" ? cacheTags.category(country, slug) : cacheTags.tag(country, slug)));
  for (const tag of tags) revalidateTag(tag);
  return tags;
}

export async function POST(request: NextRequest) {
  const metrics = getMetrics();
  const rawBody = await request.text();

  if (!isAuthorized(request, rawBody)) {
    metrics.increment("webhook.wordpress.unauthorized");
    log.warn("Rejected webhook call with missing/invalid credentials");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: WordPressWebhookPayload;
  try {
    payload = rawBody ? (JSON.parse(rawBody) as WordPressWebhookPayload) : {};
  } catch {
    metrics.increment("webhook.wordpress.bad_payload");
    log.warn("Rejected webhook call with a non-JSON body");
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, post } = payload;
  const countries = normalizeCountry(payload.country);
  // Content sync targets a single country's WordPress instance — pick the
  // resolved one when known, otherwise the default (webhooks should always
  // include `country`; this only matters for the conservative fallback).
  const syncCountry = countries[0]!;
  const actionLog = log.child({ action, country: syncCountry, slug: post?.slug, wpPostId: post?.id });
  metrics.increment("webhook.wordpress.received", 1, { action: String(action) });

  switch (action) {
    case "post_published":
    case "post_updated": {
      if (!post?.slug || post.id === undefined) {
        return NextResponse.json({ error: "post_published/post_updated requires post.id and post.slug" }, { status: 400 });
      }

      const wpPostId = normalizeWpPostId(post.id);
      const syncResult =
        wpPostId !== null
          ? await metrics.time("webhook.wordpress.sync_ms", () => syncPostById(syncCountry, wpPostId), { action })
          : { success: false, error: "invalid post id" };
      const revalidated = revalidatePost(countries, post);

      if (syncResult.success) {
        actionLog.info("Synced post and revalidated cache tags", { revalidated: revalidated.length });
      } else {
        metrics.increment("webhook.wordpress.sync_failed", 1, { action });
        actionLog.error("Content-index sync failed; cache tags still revalidated", { error: syncResult.error });
      }

      return NextResponse.json({ success: true, action, revalidated, sync: syncResult });
    }

    case "post_deleted": {
      if (!post?.slug || post.id === undefined) {
        return NextResponse.json({ error: "post_deleted requires post.id and post.slug" }, { status: 400 });
      }

      const wpPostId = normalizeWpPostId(post.id);
      const syncResult =
        wpPostId !== null ? await deletePostFromIndex(syncCountry, wpPostId) : { success: false, error: "invalid post id" };
      const revalidated = revalidatePost(countries, post);

      if (syncResult.success) {
        actionLog.info("Removed post from content index and revalidated cache tags", { revalidated: revalidated.length });
      } else {
        metrics.increment("webhook.wordpress.sync_failed", 1, { action });
        actionLog.error("Content-index delete failed; cache tags still revalidated", { error: syncResult.error });
      }

      return NextResponse.json({ success: true, action, revalidated, sync: syncResult });
    }

    case "category_updated": {
      const revalidated = revalidateTaxonomy(countries, "category", post?.slug);
      actionLog.info("Revalidated category cache tags", { revalidated: revalidated.length });
      return NextResponse.json({ success: true, action, revalidated });
    }

    case "tag_updated": {
      const revalidated = revalidateTaxonomy(countries, "tag", post?.slug);
      actionLog.info("Revalidated tag cache tags", { revalidated: revalidated.length });
      return NextResponse.json({ success: true, action, revalidated });
    }

    default:
      actionLog.warn("Ignored webhook with unhandled action");
      return NextResponse.json({ error: `Unhandled action: ${String(action)}` }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "WordPress webhook endpoint is active", timestamp: new Date().toISOString() });
}
