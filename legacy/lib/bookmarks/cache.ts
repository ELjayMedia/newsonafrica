import { cacheTags } from "@/lib/cache/cacheTags"

export interface BookmarkCacheInvalidationInput {
  userId: string
  editions?: Iterable<string | null | undefined>
  collections?: Iterable<string | null | undefined>
}

export function invalidateBookmarksCache(
  revalidate: (tag: string) => void,
  { userId, editions = [], collections = [] }: BookmarkCacheInvalidationInput,
) {
  const editionTags = new Set<string>()
  const collectionTags = new Set<string>()

  for (const edition of editions) {
    editionTags.add(cacheTags.bookmarks(edition))
  }

  if (editionTags.size === 0) {
    editionTags.add(cacheTags.bookmarks(undefined))
  }

  for (const collection of collections) {
    collectionTags.add(cacheTags.bmCollection(collection))
  }

  revalidate(cacheTags.bmUser(userId))
  editionTags.forEach((tag) => revalidate(tag))
  collectionTags.forEach((tag) => revalidate(tag))
}
