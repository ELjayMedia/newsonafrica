type SearchParams = {
  query: string
  filters?: string
  page?: number
  hitsPerPage?: number
  indexName?: string
}

export async function searchAlgolia<T = any>(params: SearchParams) {
  try {
    const response = await fetch("/api/algolia-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...params,
        indexName: params.indexName || process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Search request failed")
    }

    return await response.json()
  } catch (error) {
    console.error("Search client error:", error)
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      hits: [],
      nbHits: 0,
    }
  }
}

// Provide app info for components that need it
export const getAlgoliaAppInfo = () => ({
  appId: process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || "",
  indexName: process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || "",
})
