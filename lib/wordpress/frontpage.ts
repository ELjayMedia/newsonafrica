export async function getFpTaggedPostsForCountry(
  countryCode: string,
  limit = 8,
  request?: { timeout?: number; signal?: AbortSignal },
): Promise<HomePost[]> {
  const tags = [
    cacheTags.home(countryCode),
    cacheTags.edition(countryCode),
    cacheTags.tag(countryCode, FP_TAG_SLUG),
  ]

  try {
    console.log("[v0] Fetching FP tagged posts for:", countryCode)

    const gqlData = await fetchWordPressGraphQL<FpTaggedPostsQuery>(
      countryCode,
      FP_TAGGED_POSTS_QUERY,
      {
        tagSlugs: [FP_TAG_SLUG],
        first: limit,
      },
      {
        tags,
        revalidate: CACHE_DURATIONS.SHORT,
        timeout: request?.timeout,
        signal: request?.signal,
      },
    )

    const nodes = gqlData?.posts?.nodes?.filter(
      (node): node is NonNullable<typeof node> => Boolean(node),
    )

    if (nodes && nodes.length > 0) {
      console.log("[v0] Found", nodes.length, "FP tagged posts via GraphQL")
      return nodes.map((node) => mapGraphqlNodeToHomePost(node, countryCode))
    }

    console.log("[v0] No GraphQL results for FP tagged posts")
    return []
  } catch (error) {
    console.error("[v0] Failed to fetch FP tagged posts:", error)
    return []
  }
}
