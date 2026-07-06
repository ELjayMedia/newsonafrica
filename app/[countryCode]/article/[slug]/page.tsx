import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleBody } from "@/components/article/article-body";
import { MobileArticleReader } from "@/components/article/mobile-article-reader";
import { RelatedArticles } from "@/components/article/related-articles";
import { ShareButtons } from "@/components/article/share-buttons";
import { BookmarkButton } from "@/components/bookmark-button";
import { CommentSection, COMMENTS_CURSOR_PARAM } from "@/components/comments/comment-section";
import { HomeRail } from "@/components/home/home-rail";
import { BreadcrumbJsonLd, NewsArticleJsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { RailLayout } from "@/components/ui/rail-layout";
import { getUser } from "@/lib/auth/session";
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

  // og:image / twitter:image come from the branded card in
  // ./opengraph-image.tsx (NOA-115) — file-convention images take
  // precedence over config-based ones, so none are declared here.
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

  const shareUrl = `${publicEnv.SITE_URL}${getArticleUrl(countryCode, slug)}`;

  const user = await getUser();
  const bookmarked = user ? await isBookmarked(countryCode, post.id) : false;

  return (
    <Container className="py-8 max-md:py-0">
      {/* NewsArticle + BreadcrumbList structured data (NOA-114). */}
      <NewsArticleJsonLd post={post} />
      <BreadcrumbJsonLd
        items={[
          { name: COUNTRIES[countryCode].name, path: `/${countryCode}` },
          ...(category ? [{ name: category.name, path: `/${countryCode}/category/${category.slug}` }] : []),
          { name: post.title },
        ]}
      />

      <MobileArticleReader
        countryCode={countryCode}
        slug={slug}
        post={post}
        related={related}
        shareUrl={shareUrl}
        bookmarked={bookmarked}
        signedIn={user !== null}
        commentsCursor={commentsCursor}
      />

      <div className="hidden md:block">
        <RailLayout rail={<HomeRail mostRead={rail.mostRead} latest={rail.latest} />}>
          {/* Constrain the article to a comfortable reading measure; on desktop it
              sits left of the rail instead of centered in an empty container. */}
          <article className="mx-auto w-full max-w-3xl space-y-6 lg:mx-0">
            <header className="space-y-4">
              {category ? (
                <Link href={`/${countryCode}/category/${category.slug}`} className="w-fit">
                  <Badge>{category.name}</Badge>
                </Link>
              ) : null}

              <h1 className="heading-lg font-display text-foreground">{post.title}</h1>

              <div className="flex flex-wrap items-center justify-between gap-4 border-y border-border py-4">
                <div className="flex items-center gap-3">
                  {post.author?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted avatar
                    <img src={post.author.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : null}
                  <div className="ui-md">
                    {post.author ? (
                      <p className="font-semibold text-foreground">
                        <Link href={`/${countryCode}/author/${post.author.slug}`} className="hover:text-primary">
                          {post.author.name}
                        </Link>
                      </p>
                    ) : null}
                    <time dateTime={post.publishedAt} className="text-muted-foreground">
                      {formatDate(post.publishedAt)}
                    </time>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <ShareButtons title={post.title} url={shareUrl} />
                  <BookmarkButton
                    country={countryCode}
                    slug={slug}
                    wpPostId={post.id}
                    initialBookmarked={bookmarked}
                    signedIn={user !== null}
                  />
                </div>
              </div>
            </header>

            {post.featuredImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- external CMS-hosted image
              <img
                src={post.featuredImage.url}
                alt={post.featuredImage.alt || post.title}
                className="aspect-video w-full rounded-xl object-cover"
              />
            ) : null}

            <ArticleBody html={post.content} />

            {post.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2 border-t border-border pt-6">
                {post.tags.map((tag) => (
                  <Link
                    key={tag.slug}
                    href={`/${countryCode}/tag/${tag.slug}`}
                    className="ui-sm rounded-full border border-input px-3 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            ) : null}

            <CommentSection country={countryCode} slug={slug} wpPostId={post.id} cursorParam={commentsCursor} />

            <RelatedArticles posts={related} />
          </article>
        </RailLayout>
      </div>
    </Container>
  );
}
