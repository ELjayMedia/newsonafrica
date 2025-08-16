"use client"

import { useState } from "react"
import { fetchGraphQLClient } from "@/lib/graphql-client"

export default function GraphQLPlayground() {
  const [query, setQuery] = useState(`# Welcome to the News On Africa GraphQL API Playground
# Try running a query like this:

query {
  posts(limit: 5) {
    edges {
      id
      title
      slug
      excerpt
      author {
        name
      }
    }
    totalCount
  }
}
`)
  const [variables, setVariables] = useState("{}")
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)

  const handleRunQuery = async () => {
    try {
      setLoading(true)
      const parsedVariables = variables ? JSON.parse(variables) : {}
      const data = await fetchGraphQLClient(query, parsedVariables)
      setResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setResult(JSON.stringify({ error: error.message }, null, 2))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">GraphQL API Playground</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Query</h2>
            <textarea
              className="w-full h-80 p-2 font-mono text-sm border rounded"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Variables (JSON)</h2>
            <textarea
              className="w-full h-40 p-2 font-mono text-sm border rounded"
              value={variables}
              onChange={(e) => setVariables(e.target.value)}
            />
          </div>

          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            onClick={handleRunQuery}
            disabled={loading}
          >
            {loading ? "Running..." : "Run Query"}
          </button>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Result</h2>
          <pre className="w-full h-[32rem] p-2 font-mono text-sm border rounded overflow-auto bg-gray-50">
            {result || "Run a query to see results"}
          </pre>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Documentation</h2>

        <div className="prose max-w-none">
          <h3>Getting Started</h3>
          <p>
            The News On Africa GraphQL API provides a flexible way to query our content. You can request exactly the
            data you need, reducing bandwidth usage and improving performance.
          </p>

          <h3>Authentication</h3>
          <p>
            Some queries and mutations require authentication. To authenticate, include an Authorization header with a
            Bearer token:
          </p>
          <pre className="bg-gray-100 p-2 rounded">{`Authorization: Bearer your-token-here`}</pre>

          <h3>Common Queries</h3>
          <p>Here are some example queries to get you started:</p>

          <h4>Fetch Recent Posts</h4>
          <pre className="bg-gray-100 p-2 rounded">
            {`query {
  posts(limit: 10) {
    edges {
      id
      title
      slug
      excerpt
      date
      featuredImage {
        sourceUrl
      }
      author {
        name
      }
    }
    totalCount
  }
}`}
          </pre>

          <h4>Fetch a Single Post</h4>
          <pre className="bg-gray-100 p-2 rounded">
            {`query {
  post(slug: "example-post-slug") {
    id
    title
    content
    date
    author {
      name
    }
    categories {
      name
    }
    tags {
      name
    }
  }
}`}
          </pre>

          <h4>Search Posts</h4>
          <pre className="bg-gray-100 p-2 rounded">
            {`query {
  search(query: "climate change", limit: 5) {
    edges {
      id
      title
      excerpt
    }
    totalCount
  }
}`}
          </pre>
        </div>
      </div>
    </div>
  )
}
