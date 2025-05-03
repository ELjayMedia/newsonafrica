import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query") || ""
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const perPage = Number.parseInt(searchParams.get("hitsPerPage") || "10", 10)

    // Validate the query
    if (!query) {
      return NextResponse.json({
        hits: [],
        nbHits: 0,
        page: 0,
        nbPages: 0,
      })
    }

    // Use WordPress REST API for search
    const wpApiUrl = process.env.WORDPRESS_API_URL || ""
    if (!wpApiUrl) {
      throw new Error("WordPress API URL is not configured")
    }

    // Build the WordPress search URL
    const searchUrl = `${wpApiUrl}/wp/v2/posts?search=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&_embed=true`

    // Fetch search results from WordPress
    const response = await fetch(searchUrl, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 }, // Cache for 1 minute
    })

    if (!response.ok) {
      throw new Error(`WordPress API returned ${response.status}: ${response.statusText}`)
    }

    // Get the total number of results from headers
    const totalPosts = Number.parseInt(response.headers.get("X-WP-Total") || "0", 10)
    const totalPages = Number.parseInt(response.headers.get("X-WP-TotalPages") || "0", 10)

    // Parse the response
    const posts = await response.json()

    // Transform WordPress posts to match the expected format
    const hits = posts.map((post: any) => ({
      objectID: post.id.toString(),
      title: post.title.rendered,
      excerpt: post.excerpt.rendered,
      slug: post.slug,
      date: post.date,
      modified: post.modified,
      featuredImage: post._embedded?.["wp:featuredmedia"]?.[0]
        ? {
            node: {
              sourceUrl: post._embedded["wp:featuredmedia"][0].source_url,
            },
          }
        : undefined,
      categories:
        post._embedded?.["wp:term"]?.[0]?.map((term: any) => ({
          node: {
            name: term.name,
            slug: term.slug,
          },
        })) || [],
      author: post._embedded?.["author"]?.[0]
        ? {
            node: {
              name: post._embedded["author"][0].name,
            },
          }
        : { node: { name: "Unknown" } },
    }))

    return NextResponse.json({
      hits,
      nbHits: totalPosts,
      page: page - 1, // Adjust to 0-based for client compatibility
      nbPages: totalPages,
    })
  } catch (error) {
    console.error("Search API error:", error)
    return NextResponse.json(
      {
        error: "Failed to perform search",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
