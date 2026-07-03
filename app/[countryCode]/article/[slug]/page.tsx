import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { ArticleBody } from "@/components/article/article-body";
import { RelatedArticles } from "@/components/article/related-articles";
import { ShareButtons } from "@/components/article/share-buttons";
import { BookmarkButton } from "@/components/bookmark-button";
import { getUser } from "@/lib/auth/session";
import { getArticleUrl } from "@/lib/content-sync/article-url";
import { getPostBySlug, isValidCountry, listPosts } from "@/lib/dal";
import { isBookmarked } from "@/lib/dal/bookmarks";
import { publicEnv } from "@/lib/env";
import { formatDate } from "@/lib/format";

interface ArticlePageProps {
  params: Promise<{ countryCode: string; slug: string }>;
}

const RELATED_COUNT = 3;

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { countryCode, slug } = await params;
  if (!isValidCountry(countryCode)) return {};

  const post = await getPostBySlug(countryCode, slug);
  if (!post) return {};

  const url = getArticleUrl(countryCode, slug);
  const description = post.excerpt || post.title;
  const images = post.featuredImage ? [{ url: post.featuredImage.url, alt: post.featuredImage.alt }] : undefined;

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
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: images?.map((image) => image.url),
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { countryCode, slug } = await params;

  if (!isValidCountry(countryCode)) {
    notFound();
  }

  const post = await getPostBySlug(countryCode, slug);
  if (!post) {
    notFound();
  }

  const category = post.categories[0];
  const related = category
    ? (await listPosts({ country: countryCode, categorySlug: category.slug, perPage: RELATED_COUNT + 1 })).items
        .filter((item) => item.slug !== post.slug)
        .slice(0, RELATED_COUNT)
    : [];

  const shareUrl = `${publicEnv.SITE_URL}${getArticleUrl(countryCode, slug)}`;

  const user = await getUser();
  const bookmarked = user ? await isBookmarked(countryCode, post.id) : false;

  return (
    <Container className="max-w-3xl space-y-6 py-8">
      <header className="space-y-4">
        {category ? (
          <Link href={`/${countryCode}/category/${category.slug}`} className="w-fit">
            <Badge>{category.name}</Badge>
          </Link>
        ) : null}

        <h1 className="display-xl">{post.title}</h1>

        {post.excerpt ? <p className="body-lg text-muted-foreground">{post.excerpt}</p> : null}

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

      <RelatedArticles posts={related} />
    </Container>
  );
}
