import Link from "next/link";

import { getArticleUrl } from "@/lib/content-sync/article-url";
import { StoryMeta } from "@/components/story-meta";
import type { PostSummary } from "@/lib/dal/types";

/** Newsroom can flag a lead story as live/breaking via a WordPress tag. */
const BREAKING_TAGS = new Set(["breaking", "live", "breaking-news"]);

export function heroFlag(post: PostSummary): "LIVE" | "BREAKING" | null {
  for (const tag of post.tags) {
    const slug = tag.slug.toLowerCase();
    if (slug === "live") return "LIVE";
    if (BREAKING_TAGS.has(slug)) return "BREAKING";
  }
  return null;
}

/**
 * Lead hero (design system homepage mockup): a large image with an optional
 * red LIVE/BREAKING flag, then a sentence-case Archivo headline, a plain
 * summary and the shared meta line (BBC lead-promo text order).
 */
export function HeroLead({ post }: { post: PostSummary }) {
  const href = getArticleUrl(post.country, post.slug);
  const flag = heroFlag(post);

  return (
    <article className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-7">
      <Link
        href={href}
        className="group relative block aspect-[4/3] overflow-hidden rounded-xl bg-noa-hairline md:aspect-auto md:h-full md:min-h-[320px]"
      >
        {post.featuredImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted image
          <img
            src={post.featuredImage.url}
            alt={post.featuredImage.alt || post.title}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            aria-hidden
            className="h-full w-full"
            style={{ background: "linear-gradient(135deg,#0b5e2d,#15994a)" }}
          />
        )}
        {flag ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded bg-noa-live px-2 py-1 font-display text-[0.625rem] font-black uppercase tracking-wide text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
            {flag}
          </span>
        ) : null}
      </Link>

      {/* BBC lead-promo order: headline, plain summary, then the meta line.
          Sentence case throughout; the red LIVE/BREAKING flag stays on the
          image. */}
      <div className="flex flex-col justify-center gap-3">
        <h1 className="noa-hed text-[clamp(1.625rem,1.2rem+1vw,2.125rem)] text-foreground">
          <Link href={href} className="transition-colors hover:text-primary">
            {post.title}
          </Link>
        </h1>

        {post.excerpt ? (
          <p className="body-lg line-clamp-3 text-muted-foreground">{post.excerpt}</p>
        ) : null}

        <StoryMeta post={post} />
      </div>
    </article>
  );
}
