import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleBody } from "@/components/article/article-body";
import { CorrectionNotice } from "@/components/article/correction-notice";
import { RelatedArticles } from "@/components/article/related-articles";
import { ShareButtons } from "@/components/article/share-buttons";
import { SponsoredArticleDisclosure } from "@/components/article/sponsored-article-disclosure";
import { BookmarkButton } from "@/components/bookmark-button";
import { CommentSection, COMMENTS_CURSOR_PARAM } from "@/components/comments/comment-section";
import { HomeRail } from "@/components/home/home-rail";
import { BreadcrumbJsonLd, NewsArticleJsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { RailLayout } from "@/components/ui/rail-layout";
import { getUser } from "@/lib/auth/session";
import { estimateReadingMinutes } from "@/lib/article/reading-time";
import { shouldShowUpdatedTimestamp } from "@/lib/article/revision";
import { getArticleUrl } from "@/lib/content-sync/article-url";
import { COUNTRIES } from "@/lib/countries";
import { getPostBySlugWithFallback, getRelatedPosts, isValidCountry } from "@/lib/dal";
import { isBookmarked } from "@/lib/dal/bookmarks";
import { getHomeRailData } from "@/lib/dal/home-rail";
import { publicEnv } from "@/lib/env";
import { formatDate } from "@/lib/format";

interface ArticlePageProps {
  params: Promise<{ countryCode: string; slug: string }>;
  /** `comments` carries the comment-pagination cursor (COMMENTS_CURSOR_PARAM). */
  searchParams: Promise<{ comments?: string }>;
}

const RELATED_COUNT = 3;

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { countryCode, slug } = await params;
  if (!isValidCountry(countryCode)) return {};

  const resolved = await getPostBySlugWithFallback(countryCode, slug);
  if (!resolved) return {};
  const { post } = resolved;

  const url = getArticleUrl(countryCode, slug);
  const description = post.excerpt || post.title;

  // og:image / twitter:image come from ./opengraph-image.tsx (NOA-115):
  // the file-convention route renders the featured image when available and
  // falls back to a branded card, so no config-based images are declared here.
  return {
    title: post.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: post.author ? [post.author.name] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
    },
  };
}

export default async function ArticlePage({ params, searchParams }: ArticlePageProps) {
  const { countryCode, slug } = await params;
  const { [COMMENTS_CURSOR_PARAM]: commentsCursor } = await searchParams;

  if (!isValidCountry(countryCode)) {
    notFound();
  }

  const resolved = await getPostBySlugWithFallback(countryCode, slug);
  if (!resolved) {
    notFound();
  }
  const { post, sourceCountry } = resolved;

  const category = post.categories[0];
  const [related, rail] = await Promise.all([
    // Related by shared categories + tags, from the edition the post lives in
    // (term IDs are edition-specific), not just the first category.
    getRelatedPosts(sourceCountry, post, RELATED_COUNT),
    getHomeRailData(countryCode),
  ]);

  const shareUrl = new URL(getArticleUrl(countryCode, slug), publicEnv.SITE_URL).toString();

  const user = await getUser();
  const bookmarked = user ? await isBookmarked(countryCode, post.id) : false;

  const showUpdated = shouldShowUpdatedTimestamp(post.publishedAt, post.updatedAt);
  const corrections = post.corrections ?? [];
  const readingMinutes = estimateReadingMinutes(post.content);
  const editionName = COUNTRIES[countryCode].name;

  return (
    <Container className="py-4 md:py-8">
      {/* NewsArticle + BreadcrumbList structured data (NOA-114). */}
      <NewsArticleJsonLd post={post} />
      <BreadcrumbJsonLd
        items={[
          { name: editionName, path: `/${countryCode}` },
          ...(category
            ? [{ name: category.name, path: `/${countryCode}/category/${category.slug}` }]
            : []),
          { name: post.title },
        ]}
      />

      {/* One responsive article tree for every breakpoint (previously a
          mobile and a desktop copy were both server-rendered and toggled with
          CSS, doubling the HTML and the comment fetch). The rail joins at lg. */}
      <RailLayout
        rail={
          <HomeRail
            mostRead={rail.mostRead.filter((item) => item.slug !== post.slug)}
            // Don't offer the story the reader is already on as "latest".
            latest={rail.latest.filter((item) => item.slug !== post.slug)}
          />
        }
      >
        <article className="mx-auto w-full max-w-3xl lg:mx-0">
          <header className="space-y-4 border-b border-border pb-5 md:space-y-5 md:pb-6">
            {/* Visible breadcrumb: tells readers which edition and section
                they are in, and gives a one-tap way back up. */}
            <nav aria-label="Breadcrumb">
              <ol className="ui-sm flex flex-wrap items-center gap-x-1.5 text-muted-foreground">
                <li>
                  <Link
                    href={`/${countryCode}`}
                    className="inline-flex min-h-11 items-center hover:text-foreground md:min-h-0"
                  >
                    {editionName}
                  </Link>
                </li>
                {category ? (
                  <>
                    <li aria-hidden>›</li>
                    <li>
                      <Link
                        href={`/${countryCode}/category/${category.slug}`}
                        className="inline-flex min-h-11 items-center font-semibold uppercase tracking-wide text-noa-green-text hover:underline md:min-h-0"
                      >
                        {category.name}
                      </Link>
                    </li>
                  </>
                ) : null}
              </ol>
            </nav>

            {post.sponsor?.isSponsored ? (
              <SponsoredArticleDisclosure
                sponsor={post.sponsor}
                editionCode={countryCode}
                articleId={post.id}
                vertical={category?.slug}
              />
            ) : null}

            <h1 className="display-article text-foreground">{post.title}</h1>

            {post.excerpt ? (
              <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
                {post.excerpt}
              </p>
            ) : null}

            <div className="flex items-center gap-3">
              {post.author?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted avatar
                <img
                  src={post.author.avatarUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : null}
              <div className="ui-sm space-y-0.5 text-muted-foreground">
                <p className="text-foreground">
                  By{" "}
                  {post.author ? (
                    <Link
                      href={`/${countryCode}/author/${post.author.slug}`}
                      className="font-semibold underline-offset-4 hover:text-primary hover:underline"
                    >
                      {post.author.name}
                    </Link>
                  ) : (
                    <span className="font-semibold">News on Africa</span>
                  )}
                </p>
                <p className="flex flex-wrap gap-x-1.5">
                  <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                  {showUpdated ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>
                        Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
                      </span>
                    </>
                  ) : null}
                  <span aria-hidden>·</span>
                  <span>{readingMinutes} min read</span>
                </p>
                {/* Publisher attribution (Play news policy): one line, not a
                    repeated Source/Publisher pair. */}
                <p>Published by News on Africa · {editionName} edition</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <ShareButtons title={post.title} url={shareUrl} compact className="md:hidden" />
              <ShareButtons title={post.title} url={shareUrl} className="hidden md:flex" />
              <BookmarkButton
                country={countryCode}
                slug={slug}
                wpPostId={post.id}
                initialBookmarked={bookmarked}
                signedIn={user !== null}
              />
            </div>
          </header>

          <div className="space-y-6 pt-6 md:space-y-8">
            {corrections.length > 0 ? <CorrectionNotice entries={corrections} /> : null}

            {post.featuredImage ? (
              // Alt text describes the image for screen readers; it is not a
              // caption, so it is no longer printed beneath the photo.
              // eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted image
              <img
                src={post.featuredImage.url}
                alt={post.featuredImage.alt || post.title}
                width={post.featuredImage.width}
                height={post.featuredImage.height}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="-mx-4 aspect-[16/10] w-[calc(100%+2rem)] max-w-none object-cover sm:mx-0 sm:w-full sm:rounded-xl md:aspect-video"
              />
            ) : null}

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

            {/* Article end: topics, a second share prompt for readers who
                finished the piece, then the next-read pathway before the
                discussion. */}
            <footer className="space-y-5 border-t border-border pt-6">
              {post.tags.length > 0 ? (
                <div className="space-y-2">
                  <h2 className="ui-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Topics
                  </h2>
                  <ul className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <li key={tag.slug}>
                        <Link
                          href={`/${countryCode}/tag/${tag.slug}`}
                          className="ui-sm inline-flex min-h-10 items-center rounded-full border border-input px-3.5 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:min-h-8"
                        >
                          {tag.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <ShareButtons title={post.title} url={shareUrl} compact />
            </footer>

            <RelatedArticles posts={related} />

            <CommentSection
              country={countryCode}
              slug={slug}
              wpPostId={post.id}
              cursorParam={commentsCursor}
            />
          </div>
        </article>
      </RailLayout>
    </Container>
  );
}
