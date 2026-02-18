import type { WordPressCategory } from "@/types/wp"

export type GraphqlCategoryNode = {
  databaseId?: number | null
  name?: string | null
  slug?: string | null
  description?: string | null
  count?: number | null
}

export const mapGraphqlCategoryToWordPressCategory = (
  node: GraphqlCategoryNode | null | undefined,
): WordPressCategory => ({
  id: node?.databaseId ?? 0,
  name: node?.name ?? "",
  slug: node?.slug ?? "",
  description: node?.description ?? undefined,
  count: node?.count ?? undefined,
})
