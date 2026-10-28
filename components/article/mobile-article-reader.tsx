import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ArticleBody } from "@/components/article/article-body";
import { CorrectionNotice } from "@/components/article/correction-notice";
import { RelatedArticles } from "@/components/article/related-articles";
import { ShareButtons } from "@/components/article/share-buttons";
import { SponsoredArticleDisclosure } from "@/components/article/sponsored-article-disclosure";
import { BookmarkButton } from "@/components/bookmark-button";
import { CommentSection } from "@/components/comments/comment-section";
import { shouldShowUpdatedTimestamp } from "@/lib/article/revision";
import { COUNTRIES } from "@/lib/countries";
import { formatDate } from "@/lib/format";
import type { Post, PostSummary } from "@/lib/dal/types";

interface MobileArticleReaderProps {
  countryCode: string;
  slug: string;
  post: Post;
  related: PostSummary[];
  shareUrl: string;
  bookmarked: boolean;
  signedIn: boolean;
  commentsCursor?: string;
}

/** Mobile-only article composition focused on hierarchy, scanning and comfortable reading. */
export function MobileArticleReader({
  countryCode,
  slug,
  post,
  related,
  shareUrl,
  bookmarked,
  signedIn,
  commentsCursor,
}: MobileArticleReaderProps) {
  const category = post.categories[0];
  const countryName = COUNTRIES[post.country].name;
  const showUpdated = shouldShowUpdatedTimestamp(post.publishedAt, post.updatedAt);
  const corrections = post.corrections ?? [];

  return (
    <article className="space-y-5 pb-8 md:hidden">
      <header className="-mx-4 border-b border-border bg-background px-4 pb-5 pt-3">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link
            href={`/${countryCode}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border ui-md text-foreground"
            aria-label={`Back to ${countryName}`}
          >
            ←
          </Link>
          <Link
            href={`/${countryCode}`}
            className="noa-wordmark heading-md inline-flex h-10 items-center text-foreground"
            aria-label="News On Africa home"
          >
            NOA
          </Link>
          {/* Spacer keeps the wordmark centred. A text-size control was
              previously drawn here but did nothing when tapped. */}
          <span className="h-10 w-10" aria-hidden />
        </div>

        <div className="space-y-4">
          {category ? (
            <Link href={`/${countryCode}/category/${category.slug}`} className="inline-flex">
              <Badge>{category.name}</Badge>
            </Link>
          ) : null}

          {post.sponsor?.isSponsored ? (
            <SponsoredArticleDisclosure
              sponsor={post.sponsor}
              editionCode={countryCode}
              articleId={post.id}
              vertical={category?.slug}
            />
          ) : null}

          <h1 className="display-article text-foreground">{post.title}</h1>

          <div className="space-y-1.5">
            <p className="ui-sm flex flex-wrap items-center gap-x-1.5 text-muted-foreground">
              {post.author ? (
                <Link
                  href={`/${countryCode}/author/${post.author.slug}`}
                  className="font-semibold text-foreground hover:text-primary"
                >
                  {post.author.name}
                </Link>
              ) : (
                <span className="font-semibold text-foreground">News on Africa</span>
              )}
              <span aria-hidden>·</span>
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              <span aria-hidden>·</span>
              <span>{countryName}</span>
            </p>
            <p className="ui-sm text-muted-foreground">
              Source: News on Africa <span aria-hidden>·</span> Publisher: News on Africa
            </p>
            {showUpdated ? (
              <p className="ui-sm text-muted-foreground">
                Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {post.featuredImage ? (
        <figure className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted image */}
          <img
            src={post.featuredImage.url}
            alt={post.featuredImage.alt || post.title}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="aspect-[16/11] w-full rounded-2xl object-cover shadow-sm"
          />
          {post.featuredImage.alt ? (
            <figcaption className="ui-sm text-muted-foreground">
              {post.featuredImage.alt}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      <div className="space-y-3 border-b border-border pb-5">
        <ShareButtons title={post.title} url={shareUrl} compact />
        <BookmarkButton
          country={countryCode}
          slug={slug}
          wpPostId={post.id}
          initialBookmarked={bookmarked}
          signedIn={signedIn}
          className="items-start"
        />
      </div>

      {corrections.length > 0 ? <CorrectionNotice entries={corrections} /> : null}

      <ArticleBody html={post.content} />

      {post.sponsor?.isSponsored ? (
        <SponsoredArticleDisclosure
          sponsor={post.sponsor}
          editionCode={countryCode}
          articleId={post.id}
          vertical={category?.slug}
          variant="footer"
        />
      ) : null}

      {post.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-border pt-5">
          {post.tags.map((tag) => (
            <Link
              key={tag.slug}
              href={`/${countryCode}/tag/${tag.slug}`}
              className="ui-sm inline-flex min-h-10 items-center rounded-full border border-input px-3.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              #{tag.name}
            </Link>
          ))}
        </div>
      ) : null}

      <RelatedArticles posts={related} />
      <CommentSection
        country={countryCode}
        slug={slug}
        wpPostId={post.id}
        cursorParam={commentsCursor}
      />
    </article>
  );
}
