import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ArticleBody } from "@/components/article/article-body";
import { RelatedArticles } from "@/components/article/related-articles";
import { ShareButtons } from "@/components/article/share-buttons";
import { BookmarkButton } from "@/components/bookmark-button";
import { CommentSection } from "@/components/comments/comment-section";
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

  return (
    <article className="space-y-5 pb-8 md:hidden">
      <header className="-mx-4 border-b border-border bg-background px-4 pb-5 pt-3">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link
            href={`/${countryCode}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-lg text-foreground"
            aria-label={`Back to ${countryName}`}
          >
            ←
          </Link>
          <Link href={`/${countryCode}`} className="noa-wordmark text-xl text-foreground" aria-label="News On Africa home">
            NOA
          </Link>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-sm text-muted-foreground">
            Aa
          </span>
        </div>

        <div className="space-y-4">
          {category ? (
            <Link href={`/${countryCode}/category/${category.slug}`} className="inline-flex">
              <Badge>{category.name}</Badge>
            </Link>
          ) : null}

          <h1 className="font-display text-[clamp(1.125rem,6vw,1.625rem)] font-black leading-[1.05] tracking-tight text-foreground">
            {post.title}
          </h1>

          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
            {post.author?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted avatar
              <img src={post.author.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                {post.author?.name.charAt(0) ?? "N"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {post.author ? (
                <Link
                  href={`/${countryCode}/author/${post.author.slug}`}
                  className="ui-md font-semibold text-foreground hover:text-primary"
                >
                  {post.author.name}
                </Link>
              ) : null}
              <p className="ui-sm text-muted-foreground">
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                <span aria-hidden> · </span>
                {countryName}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <ShareButtons title={post.title} url={shareUrl} className="flex-nowrap overflow-x-auto pb-1" />
            <BookmarkButton
              country={countryCode}
              slug={slug}
              wpPostId={post.id}
              initialBookmarked={bookmarked}
              signedIn={signedIn}
              className="items-start"
            />
          </div>
        </div>
      </header>

      {post.featuredImage ? (
        <figure className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted image */}
          <img
            src={post.featuredImage.url}
            alt={post.featuredImage.alt || post.title}
            className="aspect-[16/11] w-full rounded-2xl object-cover shadow-sm"
          />
          {post.featuredImage.alt ? <figcaption className="ui-sm text-muted-foreground">{post.featuredImage.alt}</figcaption> : null}
        </figure>
      ) : null}

      <ArticleBody html={post.content} className="text-[1.075rem] leading-8" />

      {post.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-border pt-5">
          {post.tags.map((tag) => (
            <Link
              key={tag.slug}
              href={`/${countryCode}/tag/${tag.slug}`}
              className="ui-sm rounded-full border border-input px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              #{tag.name}
            </Link>
          ))}
        </div>
      ) : null}

      <RelatedArticles posts={related} />
      <CommentSection country={countryCode} slug={slug} wpPostId={post.id} cursorParam={commentsCursor} />
    </article>
  );
}
