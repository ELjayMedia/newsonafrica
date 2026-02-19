import type { GraphqlPostNode } from "@/lib/mapping/post-mappers"

type UnknownObject = Record<string, unknown>

const isObject = (value: unknown): value is UnknownObject =>
  typeof value === "object" && value !== null

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined

const asObject = (value: unknown): UnknownObject | undefined =>
  isObject(value) ? value : undefined

const isLikelyGraphqlPostNode = (value: UnknownObject): boolean =>
  typeof value.id === "string" ||
  typeof value.databaseId === "number" ||
  typeof value.slug === "string" ||
  typeof value.title === "string"

export const normalizeGraphqlPostNode = (value: unknown): GraphqlPostNode | null => {
  if (!isObject(value) || !isLikelyGraphqlPostNode(value)) {
    return null
  }

  const featuredImageNode = asObject(asObject(value.featuredImage)?.node)
  const mediaDetails = asObject(featuredImageNode?.mediaDetails)

  const authorNode = asObject(asObject(value.author)?.node)
  const authorAvatar = asObject(authorNode?.avatar)

  const categories = asObject(value.categories)
  const tags = asObject(value.tags)

  const categoryNodes = Array.isArray(categories?.nodes) ? categories.nodes : undefined
  const tagNodes = Array.isArray(tags?.nodes) ? tags.nodes : undefined

  return {
    id: asString(value.id) ?? null,
    databaseId: asNumber(value.databaseId) ?? null,
    slug: asString(value.slug) ?? null,
    date: asString(value.date) ?? null,
    modified: asString(value.modified) ?? null,
    title: asString(value.title) ?? null,
    excerpt: asString(value.excerpt) ?? null,
    content: asString(value.content) ?? null,
    uri: asString(value.uri) ?? null,
    link: asString(value.link) ?? null,
    featuredImage: featuredImageNode
      ? {
          node: {
            sourceUrl: asString(featuredImageNode.sourceUrl) ?? null,
            altText: asString(featuredImageNode.altText) ?? null,
            caption: asString(featuredImageNode.caption) ?? null,
            mediaDetails: mediaDetails
              ? {
                  width: asNumber(mediaDetails.width) ?? null,
                  height: asNumber(mediaDetails.height) ?? null,
                }
              : null,
          },
        }
      : null,
    author: authorNode
      ? {
          node: {
            databaseId: asNumber(authorNode.databaseId) ?? null,
            name: asString(authorNode.name) ?? null,
            slug: asString(authorNode.slug) ?? null,
            description: asString(authorNode.description) ?? null,
            avatar: authorAvatar ? { url: asString(authorAvatar.url) ?? null } : null,
          },
        }
      : null,
    categories: {
      nodes:
        categoryNodes
          ?.filter(isObject)
          .map((category) => ({
            databaseId: asNumber(category.databaseId) ?? null,
            name: asString(category.name) ?? null,
            slug: asString(category.slug) ?? null,
            description: asString(category.description) ?? null,
            count: asNumber(category.count) ?? null,
          })) ?? null,
    },
    tags: {
      nodes:
        tagNodes
          ?.filter(isObject)
          .map((tag) => ({
            databaseId: asNumber(tag.databaseId) ?? null,
            name: asString(tag.name) ?? null,
            slug: asString(tag.slug) ?? null,
          })) ?? null,
    },
  }
}
