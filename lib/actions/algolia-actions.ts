"use server"

import algoliasearch from "algoliasearch"

export async function reindexAlgolia() {
  try {
    // Initialize Algolia client with server-side admin API key
    const client = algoliasearch(
      process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || "",
      process.env.ALGOLIA_ADMIN_API_KEY || "", // Use admin key, not search key
    )

    const index = client.initIndex(process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || "")

    // Reindex logic here...

    return { success: true, message: "Reindexing started successfully" }
  } catch (error) {
    console.error("Algolia reindexing error:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error during reindexing",
    }
  }
}
