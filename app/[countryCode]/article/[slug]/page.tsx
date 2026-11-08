import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdSlot } from "@/components/ads/ad-slot";
import { ArticleActions } from "@/components/article/article-actions";
import { ArticleBody } from "@/components/article/article-body";
import { ArticleToolbar } from "@/components/article/article-toolbar";
import { CorrectionNotice } from "@/components/article/correction-notice";
import { RelatedArticles } from "@/components/article/related-articles";
import { SponsoredArticleDisclosure } from "@/components/article/sponsored-article-disclosure";
import { CommentSection, COMMENTS_CURSOR_PARAM } from "@/components/comments/comment-section";
import { HomeRail } from "@/components/home/home-rail";
import { BreadcrumbJsonLd, NewsArticleJsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { RailLayout } from "@/components/ui/rail-layout";
import { getUser } from "@/lib/auth/session";
import { leadImageAspectRatio } from "@/lib/article/lead-image";
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
    <>
      {/* Compact app-style toolbar below md (back · mark); the global
          masthead and utility bar hide on article routes there. */}
      <ArticleToolbar fallbackHref={`/${countryCode}`} fallbackLabel={editionName} />
      <Container className="pb-8 pt-3 md:py-8">
        {/* Desktop billboard under the header, on the grey canvas. */}
        <AdSlot format="billboard" className="mb-6 hidden lg:block" />
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
            {/* Reading order follows the BBC / News24 article pattern: section
              eyebrow, headline, time, byline, publisher row, then
              the lead image and copy. */}
            <header className="space-y-3 md:space-y-5">
              <nav aria-label="Breadcrumb">
                <ol className="flex flex-wrap items-center gap-x-2">
                  {category ? (
                    <li>
                      <Link
                        href={`/${countryCode}/category/${category.slug}`}
                        className="noa-eyebrow inline-flex min-h-6 items-center text-noa-green-text hover:underline md:min-h-0"
                      >
                        {category.name}
                      </Link>
                    </li>
                  ) : null}
                  <li className="flex items-center gap-x-2">
                    {category ? (
                      <span aria-hidden className="text-noa-faint">
                        ·
                      </span>
                    ) : null}
                    <Link
                      href={`/${countryCode}`}
                      className="noa-eyebrow inline-flex min-h-6 items-center text-noa-muted hover:text-noa-ink md:min-h-0"
                    >
                      {editionName}
                    </Link>
                  </li>
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

              <div className="space-y-2 md:space-y-3">
                <p className="ui-sm flex flex-wrap items-center gap-x-1.5 gap-y-1 text-muted-foreground">
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

                <div className="flex items-center gap-3">
                  {post.author?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted avatar
                    <img
                      src={post.author.avatarUrl}
                      alt=""
                      width={36}
                      height={36}
                      className="hidden h-9 w-9 shrink-0 rounded-full object-cover md:block"
                    />
                  ) : null}
                  <p className="body-md text-foreground">
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
                </div>
              </div>

              {/* Publisher row (News24 pattern): attribution on the left (Play
                news policy); share, save and comments as one icon group on
                the right, at every breakpoint. */}
              <div className="flex items-center justify-between gap-4 border-y border-border py-1 md:py-2">
                <p className="ui-sm min-w-0 text-muted-foreground">
                  <span className="font-semibold text-foreground">News on Africa</span> ·{" "}
                  {editionName} edition
                </p>
                <ArticleActions
                  country={countryCode}
                  slug={slug}
                  wpPostId={post.id}
                  title={post.title}
                  shareUrl={shareUrl}
                  bookmarked={bookmarked}
                  signedIn={user !== null}
                />
              </div>
            </header>

            <div className="space-y-5 pt-4 md:space-y-8 md:pt-6">
              {corrections.length > 0 ? <CorrectionNotice entries={corrections} /> : null}

              {post.featuredImage ? (
                // Lead image runs edge to edge on phones (BBC / News24) and sits
                // in the column with the design-system radius from sm up. The
                // frame follows the image's own shape (square to 16:9) so
                // poster artwork is not cropped. Alt text is for screen
                // readers, so it is not printed as a caption.
                // eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted image
                <img
                  src={post.featuredImage.url}
                  alt={post.featuredImage.alt || post.title}
                  width={post.featuredImage.width}
                  height={post.featuredImage.height}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  style={{
                    aspectRatio: leadImageAspectRatio(
                      post.featuredImage.width,
                      post.featuredImage.height,
                    ),
                  }}
                  className="-mx-4 w-[calc(100%+2rem)] max-w-none bg-noa-hairline object-cover sm:mx-0 sm:w-full sm:rounded-lg"
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

              {/* Article end: topics, then the next-read pathway before the
                discussion. */}
              {post.tags.length > 0 ? (
                <footer className="space-y-2 border-t border-border pt-6">
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
                </footer>
              ) : null}

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
    </>
  );
}
