import { GraphQLClient } from "graphql-request"
import { cache } from "react"

const endpoint = "/api/graphql"

// Create a GraphQL client
export const graphqlClient = new GraphQLClient(endpoint, {
  headers: {
    "Content-Type": "application/json",
  },
})

// Set authorization header if user is logged in
export function setAuthToken(token: string | null) {
  if (token) {
    graphqlClient.setHeader("Authorization", `Bearer ${token}`)
  } else {
    graphqlClient.setHeader("Authorization", "")
  }
}

// Cached query function for server components
export const fetchGraphQL = cache(
  async <T = unknown>(query: string, variables: Record<string, unknown> = {}): Promise<T> => {
    try {
      return await graphqlClient.request<T>(query, variables)
    } catch (error) {
      console.error("GraphQL request error:", error)
      throw error
    }
  },
)

// Client-side query function
export async function fetchGraphQLClient<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
  token?: string,
): Promise<T> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query,
        variables,
      }),
    })

    const result = await response.json()

    if (result.errors) {
      throw new Error(result.errors[0].message)
    }

    return result.data as T
  } catch (error) {
    console.error("GraphQL client request error:", error)
    throw error
  }
}
