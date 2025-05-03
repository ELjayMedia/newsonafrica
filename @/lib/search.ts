export async function search(
  query: string,
  options: {
    page?: number
    hitsPerPage?: number
  } = {},
) {
  const { page = 0, hitsPerPage = 10 } = options

  try {
    // Convert to 1-based pagination for WordPress
    const wpPage = page + 1

    const response = await fetch(
      `/api/search?query=${encodeURIComponent(query)}&page=${wpPage}&hitsPerPage=${hitsPerPage}`,
      { next: { revalidate: 60 } }, // Cache for 1 minute
    )

    if (!response.ok) {
      throw new Error("Search request failed")
    }

    return await response.json()
  } catch (error) {
    console.error("Search error:", error)
    return { hits: [], nbHits: 0, page, nbPages: 0 }
  }
}
