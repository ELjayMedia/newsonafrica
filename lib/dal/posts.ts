import "server-only";

import { cacheTags } from "@/lib/wordpress/cache-tags";
import { SUPPORTED_COUNTRY_CODES } from "@/lib/countries";
import type { CountryCode } from "@/lib/wordpress/countries";
import { fetchWordPressGraphQL } from "@/lib/wordpress/graphql-client";
import { buildPaginatedResult, normalizePage, normalizePerPage } from "@/lib/dal/pagination";
import type { AuthorSummary, CategorySummary, PaginatedResult, Post, PostListParams, PostSummary, TagSummary } from "@/lib/dal/types";
import { decodeHtmlEntities, stripHtml } from "@/lib/wordpress/html";

const REVALIDATE_SECONDS = 60;

const POST_FIELDS = /* GraphQL */ `
  databaseId
  slug
  date
  modified
  status
  title(format: RENDERED)
  excerpt(format: RENDERED)
  content(format: RENDERED)
  featuredImage {
    node {
      sourceUrl
      altText
      mediaDetails {
        width
        height
      }
    }
  }
  categories {
    nodes {
      databaseId
      name
      slug
    }
  }
  tags {
    nodes {
      databaseId
      name
      slug
    }
  }
  author {
    node {
      databaseId
      name
      slug
      avatar {
        url
      }
    }
  }
  corrections {
    nodes {
      date
      note
      kind
    }
  }
  sponsor {
    isSponsored
    sponsorName
    sponsorTier
    disclosureLabel
    campaignId
  }
`;

const POSTS_LIST_QUERY = /* GraphQL */ `
  query PostsList(
    $first: Int!
    $categoryName: String
    $tagSlugIn: [String]
    $authorName: String
    $search: String
  ) {
    posts(
      first: $first
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        categoryName: $categoryName
        tagSlugIn: $tagSlugIn
        authorName: $authorName
        search: $search
      }
    ) {
      pageInfo {
        hasNextPage
      }
      nodes {
        ${POST_FIELDS}
      }
    }
  }
`;

const POST_BY_SLUG_QUERY = /* GraphQL */ `
  query PostBySlug($slug: ID!) {
    post(id: $slug, idType: SLUG) {
      ${POST_FIELDS}
    }
  }
`;

const POST_BY_ID_QUERY = /* GraphQL */ `
  query PostById($id: ID!) {
    post(id: $id, idType: DATABASE_ID) {
      ${POST_FIELDS}
    }
  }
`;

type GqlTerm = { databaseId?: number | null; name?: string | null; slug?: string | null };
type GqlAuthor = { databaseId?: number | null; name?: string | null; slug?: string | null; avatar?: { url?: string | null } | null };
type GqlCorrection = { date?: string | null; note?: string | null; kind?: string | null };
type GqlSponsor = {
  isSponsored?: boolean | null;
  sponsorName?: string | null;
  sponsorTier?: string | null;
  disclosureLabel?: string | null;
  campaignId?: string | null;
};
type GqlPost = {
  databaseId?: number | null;
  slug?: string | null;
  date?: string | null;
  modified?: string | null;
  status?: string | null;
  title?: string | null;
  excerpt?: string | null;
  content?: string | null;
  featuredImage?: { node?: { sourceUrl?: string | null; altText?: string | null; mediaDetails?: { width?: number | null; height?: number | null } | null } | null } | null;
  categories?: { nodes?: GqlTerm[] | null } | null;
  tags?: { nodes?: GqlTerm[] | null } | null;
  author?: { node?: GqlAuthor | null } | null;
  corrections?: { nodes?: GqlCorrection[] | null } | null;
  sponsor?: GqlSponsor | null;
};

type PostsListData = { posts?: { pageInfo?: { hasNextPage?: boolean }; nodes?: GqlPost[] | null } | null };
type PostData = { post?: GqlPost | null };

function mapTerm(term: GqlTerm): CategorySummary | TagSummary {
  return {
    id: term.databaseId ?? 0,
    name: decodeHtmlEntities(term.name ?? ""),
    slug: term.slug ?? "",
  };
}

function mapAuthor(author?: GqlAuthor | null): AuthorSummary | null {
  if (!author) return null;
  return {
    id: author.databaseId ?? 0,
    name: decodeHtmlEntities(author.name ?? ""),
    slug: author.slug ?? "",
    avatarUrl: author.avatar?.url ?? undefined,
  };
}

function mapCorrections(corrections?: { nodes?: GqlCorrection[] | null } | null): Post["corrections"] {
  if (!corrections?.nodes?.length) return undefined;
  return corrections.nodes
    .filter((c) => c.date && c.note && c.kind)
    .map((c) => ({
      date: c.date!,
      note: c.note!,
      kind: c.kind === "update" ? "update" as const : "correction" as const,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function mapSponsor(sponsor?: GqlSponsor | null): Post["sponsor"] {
  if (!sponsor?.isSponsored) return undefined;
  return {
    isSponsored: true,
    sponsorName: sponsor.sponsorName ?? "Sponsor",
    sponsorTier: sponsor.sponsorTier ?? undefined,
    disclosureLabel: sponsor.disclosureLabel ?? "Paid partnership",
    campaignId: sponsor.campaignId ?? undefined,
  };
}

function mapGraphQLPost(raw: GqlPost, country: CountryCode | string): Post {
  const image = raw.featuredImage?.node;
  return {
    id: raw.databaseId ?? 0,
    slug: raw.slug ?? "",
    country: country as CountryCode,
    title: decodeHtmlEntities(raw.title ?? ""),
    excerpt: stripHtml(raw.excerpt ?? ""),
    content: raw.content ?? "",
    status: raw.status ?? "publish",
    publishedAt: raw.date ?? "",
    updatedAt: raw.modified ?? raw.date ?? "",
    featuredImage: image?.sourceUrl
      ? {
          url: image.sourceUrl,
          alt: image.altText ?? "",
          width: image.mediaDetails?.width ?? undefined,
          height: image.mediaDetails?.height ?? undefined,
        }
      : null,
    categories: (raw.categories?.nodes ?? []).map(mapTerm),
    tags: (raw.tags?.nodes ?? []).map(mapTerm),
    author: mapAuthor(raw.author?.node),
    corrections: mapCorrections(raw.corrections),
    sponsor: mapSponsor(raw.sponsor),
  };
}

function mapGraphQLPostSummary(raw: GqlPost, country: CountryCode | string): PostSummary {
  const { content: _content, ...summary } = mapGraphQLPost(raw, country);
  void _content;
  return summary;
}

async function graphQL<T>(country: CountryCode | string, query: string, variables: Record<string, unknown>, tags: string[], operationName: string): Promise<T> {
  const result = await fetchWordPressGraphQL<T>(country, query, variables, {
    tags,
    revalidate: REVALIDATE_SECONDS,
    operationName,
  });

  if (!result.ok) throw result.error;
  return result.data;
}

export async function listPosts(params: PostListParams): Promise<PaginatedResult<PostSummary>> {
  const page = normalizePage(params.page);
  const perPage = normalizePerPage(params.perPage);
  const first = page * perPage;
  const tags = [cacheTags.posts(params.country)];
  if (params.categorySlug) tags.push(cacheTags.category(params.country, params.categorySlug));
  if (params.tagSlug) tags.push(cacheTags.tag(params.country, params.tagSlug));
  if (params.authorSlug) tags.push(cacheTags.author(params.country, params.authorSlug));
  if (params.search) tags.push(cacheTags.search(params.country, params.search));

  const data = await graphQL<PostsListData>(
    params.country,
    POSTS_LIST_QUERY,
    {
      first,
      categoryName: params.categorySlug ?? null,
      tagSlugIn: params.tagSlug ? [params.tagSlug] : null,
      authorName: params.authorSlug ?? null,
      search: params.search ?? null,
    },
    tags,
    "PostsList",
  );

  const allItems = data.posts?.nodes ?? [];
  const items = allItems.slice((page - 1) * perPage, page * perPage).map((raw) => mapGraphQLPostSummary(raw, params.country));
  const hasNextPage = Boolean(data.posts?.pageInfo?.hasNextPage) || allItems.length > page * perPage;
  const total = hasNextPage ? page * perPage + 1 : (page - 1) * perPage + items.length;

  return buildPaginatedResult(items, page, perPage, {
    total,
    totalPages: hasNextPage ? page + 1 : page,
  });
}

export async function getRelatedPosts(
  country: CountryCode | string,
  post: Pick<Post, "id" | "categories" | "tags">,
  limit = 3,
): Promise<PostSummary[]> {
  const categorySlug = post.categories[0]?.slug;
  const tagSlug = post.tags[0]?.slug;
  if (!categorySlug && !tagSlug) return [];

  const data = await graphQL<PostsListData>(
    country,
    POSTS_LIST_QUERY,
    {
      first: limit + 4,
      categoryName: categorySlug ?? null,
      tagSlugIn: tagSlug ? [tagSlug] : null,
      authorName: null,
      search: null,
    },
    [cacheTags.posts(country)],
    "PostsList",
  );

  return (data.posts?.nodes ?? [])
    .map((raw) => mapGraphQLPostSummary(raw, country))
    .filter((summary) => summary.id !== post.id)
    .slice(0, limit);
}

export async function getPostBySlug(country: CountryCode | string, slug: string): Promise<Post | null> {
  const data = await graphQL<PostData>(
    country,
    POST_BY_SLUG_QUERY,
    { slug },
    [cacheTags.postSlug(country, slug), cacheTags.posts(country)],
    "PostBySlug",
  );

  return data.post ? mapGraphQLPost(data.post, country) : null;
}

export async function getPostBySlugWithFallback(
  country: CountryCode | string,
  slug: string,
): Promise<{ post: Post; sourceCountry: CountryCode } | null> {
  const primary = await getPostBySlug(country, slug).catch(() => null);
  if (primary) return { post: primary, sourceCountry: primary.country };

  const others = SUPPORTED_COUNTRY_CODES.filter((code) => code !== country);
  const results = await Promise.all(
    others.map(async (code) => ({ code, post: await getPostBySlug(code, slug).catch(() => null) })),
  );

  const hit = results.find((result) => result.post !== null);
  return hit && hit.post ? { post: hit.post, sourceCountry: hit.code } : null;
}

export async function getPostById(country: CountryCode | string, id: number): Promise<Post | null> {
  const data = await graphQL<PostData>(
    country,
    POST_BY_ID_QUERY,
    { id: String(id) },
    [cacheTags.post(country, id), cacheTags.posts(country)],
    "PostById",
  );

  return data.post ? mapGraphQLPost(data.post, country) : null;
}

export async function listPostsForSync(
  country: CountryCode | string,
  { page = 1, perPage = 50 }: { page?: number; perPage?: number } = {},
): Promise<{ posts: Post[]; total: number; hasNextPage: boolean }> {
  const normalizedPage = normalizePage(page);
  const normalizedPerPage = normalizePerPage(perPage);
  const first = normalizedPage * normalizedPerPage;

  const result = await fetchWordPressGraphQL<PostsListData>(
    country,
    POSTS_LIST_QUERY,
    { first, categoryName: null, tagSlugIn: null, authorName: null, search: null },
    { tags: [cacheTags.posts(country)], revalidate: 0, operationName: "PostsList" },
  );
  if (!result.ok) throw result.error;

  const allItems = result.data.posts?.nodes ?? [];
  const windowItems = allItems.slice((normalizedPage - 1) * normalizedPerPage, first);
  const posts = windowItems.map((raw) => mapGraphQLPost(raw, country));
  const hasNextPage = Boolean(result.data.posts?.pageInfo?.hasNextPage) || allItems.length > first;
  const total = hasNextPage ? first + 1 : (normalizedPage - 1) * normalizedPerPage + posts.length;

  return { posts, total, hasNextPage };
}
