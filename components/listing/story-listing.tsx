import Link from "next/link";

import { ArticleCard } from "@/components/article/article-card";
import { getArticleUrl } from "@/lib/content-sync/article-url";
import { formatDate } from "@/lib/format";
import type { PostSummary } from "@/lib/dal/types";

/**
 * Listing-page building blocks (category, and reusable for tag/author) in the
 * same simplified language as the article page: a quiet eyebrow + display
 * headline, an edge-to-edge lead story on phones, then thumbnail rows. One
 * responsive tree at every breakpoint — no separate mobile/desktop copies.
 */

export interface ListingHeaderProps {
  /** Small label above the title, e.g. the edition name. */
  eyebrow: { label: string; href?: string };
  title: string;
  description?: string;
  /** Total stories in the listing; omitted when unknown. */
  total?: number;
}

export function ListingHeader({ eyebrow, title, description, total }: ListingHeaderProps) {
  return (
    <header className="space-y-3 border-b border-border pb-5 md:pb-6">
      {eyebrow.href ? (
        <Link
          href={eyebrow.href}
          className="noa-eyebrow inline-flex min-h-11 items-center text-noa-muted hover:text-noa-ink md:min-h-0"
        >
          {eyebrow.label}
        </Link>
      ) : (
        <p className="noa-eyebrow text-noa-muted">{eyebrow.label}</p>
      )}
      <h1 className="display-article text-foreground">{title}</h1>
      {description ? <p className="body-lg text-muted-foreground">{description}</p> : null}
      {typeof total === "number" && total > 0 ? (
        <p className="ui-sm text-muted-foreground">
          {total.toLocaleString()} {total === 1 ? "story" : "stories"}
        </p>
      ) : null}
    </header>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-4 w-4 shrink-0"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export interface ListingLeadProps {
  post: PostSummary;
  /** Show the post's category eyebrow (off on a category page, where it is the page). */
  showCategory?: boolean;
}

/**
 * Lead story: image edge to edge on phones (rounded in the column from sm),
 * then the headline and a clock + date / byline line — the article page's
 * header rhythm in miniature (no standfirst, matching the article).
 */
export function ListingLead({ post, showCategory = true }: ListingLeadProps) {
  const href = getArticleUrl(post.country, post.slug);
  const category = post.categories[0];

  return (
    <article className="space-y-4">
      <Link
        href={href}
        className="group -mx-4 block overflow-hidden bg-noa-hairline sm:mx-0 sm:rounded-lg"
      >
        {post.featuredImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted image
          <img
            src={post.featuredImage.url}
            alt={post.featuredImage.alt || post.title}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div
            aria-hidden
            className="aspect-video w-full"
            style={{ background: "linear-gradient(135deg,#0b5e2d,#15994a)" }}
          />
        )}
      </Link>

      <div className="space-y-3">
        {showCategory && category ? (
          <Link
            href={`/${post.country}/category/${category.slug}`}
            className="noa-eyebrow inline-flex text-noa-green-text hover:underline"
          >
            {category.name}
          </Link>
        ) : null}
        <h2 className="font-display text-2xl font-extrabold leading-tight tracking-[-0.02em] text-foreground md:text-3xl">
          <Link href={href} className="transition-colors hover:text-primary">
            {post.title}
          </Link>
        </h2>
        <p className="ui-sm flex flex-wrap items-center gap-x-1.5 gap-y-1 text-muted-foreground">
          <ClockIcon />
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          {post.author ? (
            <>
              <span aria-hidden>·</span>
              <span>{post.author.name}</span>
            </>
          ) : null}
        </p>
      </div>
    </article>
  );
}

/**
 * Story-list layouts shared by ListingRows and the infinite feed so server-
 * rendered and appended stories line up:
 * - `rows`: thumbnail rows at every width (as "You might also like").
 * - `grid`: category feeds, News24-style — thumbnail rows on phones, two
 *   image-on-top cards per row from md up.
 */
export type StoryListLayout = "rows" | "grid";

export const STORY_LIST_CLASSES: Record<StoryListLayout, { list: string; item: string }> = {
  rows: { list: "divide-y divide-border border-t border-border", item: "py-4" },
  grid: {
    list: "divide-y divide-border border-t border-border md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-8 md:divide-y-0 md:border-t-0",
    item: "py-4 md:py-0",
  },
};

export const STORY_LIST_CARD_VARIANT = { rows: "list", grid: "feed" } as const;

export interface ListingRowsProps {
  posts: PostSummary[];
  showCategory?: boolean;
  layout?: StoryListLayout;
}

/** Server-rendered story list in one of the shared layouts. */
export function ListingRows({ posts, showCategory = true, layout = "rows" }: ListingRowsProps) {
  if (posts.length === 0) return null;

  return (
    <ul className={STORY_LIST_CLASSES[layout].list}>
      {posts.map((post) => (
        <li key={`${post.country}-${post.id}`} className={STORY_LIST_CLASSES[layout].item}>
          <ArticleCard
            post={post}
            variant={STORY_LIST_CARD_VARIANT[layout]}
            showCategory={showCategory}
          />
        </li>
      ))}
    </ul>
  );
}
