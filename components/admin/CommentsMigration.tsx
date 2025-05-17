"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle, Database } from "lucide-react"

export default function CommentsMigration() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [results, setResults] = useState<any>(null)

  const runMigration = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)
      setResults(null)

      const response = await fetch("/api/db/migrate-comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to run migration")
      }

      setSuccess(true)
      setResults(data.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  const renderResultItem = (key: string, value: string) => {
    const isAdded = value === "added" || value === "created"
    const icon = isAdded ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <CheckCircle className="h-4 w-4 text-gray-400" />
    )

    return (
      <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100">
        <span className="font-medium">{key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</span>
        <div className="flex items-center">
          <span className={`mr-2 ${isAdded ? "text-green-600" : "text-gray-500"}`}>
            {value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </span>
          {icon}
        </div>
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Database className="mr-2 h-5 w-5" />
          Comments Table Migration
        </CardTitle>
        <CardDescription>Add missing columns to the comments table for enhanced functionality</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>Comments table migration completed successfully</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <p>This migration will add the following columns to the comments table if they don't already exist:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <code>status</code> - For comment moderation (active, deleted, flagged)
            </li>
            <li>
              <code>is_rich_text</code> - Boolean flag for rich text content
            </li>
            <li>
              <code>reaction_count</code> - Integer for tracking reactions
            </li>
            <li>
              <code>reported_by</code> - User ID of the reporter
            </li>
            <li>
              <code>report_reason</code> - Text reason for reporting
            </li>
            <li>
              <code>reviewed_at</code> - Timestamp of review
            </li>
            <li>
              <code>reviewed_by</code> - User ID of the reviewer
            </li>
          </ul>

          <p>
            It will also create the <code>comment_reactions</code> table if it doesn't exist, along with appropriate
            indexes and triggers.
          </p>
        </div>

        {results && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Migration Results:</h3>
            <div className="border rounded-md p-3 bg-gray-50">
              {Object.entries(results).map(([key, value]) => renderResultItem(key, value as string))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={runMigration} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Migration...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Run Comments Table Migration
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
