"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

interface IndexInfo {
  table_name: string
  index_name: string
  column_names: string[]
  is_unique: boolean
}

export default function DatabaseIndexes() {
  const [indexes, setIndexes] = useState<IndexInfo[]>([])
  const [selectedTable, setSelectedTable] = useState<string>("profiles")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const tables = ["profiles", "comments", "comment_reactions", "notifications", "bookmarks"]

  useEffect(() => {
    fetchIndexes(selectedTable)
  }, [selectedTable])

  const fetchIndexes = async (table: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/db/indexes?table=${table}`)
      if (!response.ok) {
        throw new Error("Failed to fetch indexes")
      }
      const data = await response.json()
      setIndexes(data.indexes || [])
    } catch (err) {
      setError("Failed to fetch indexes")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const createRecommendedIndexes = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch("/api/db/indexes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "create_recommended" }),
      })

      if (!response.ok) {
        throw new Error("Failed to create recommended indexes")
      }

      setSuccess("Successfully created recommended indexes")
      // Refresh the current table's indexes
      fetchIndexes(selectedTable)
    } catch (err) {
      setError("Failed to create recommended indexes")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const analyzeTables = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch("/api/db/indexes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "analyze_tables" }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze tables")
      }

      setSuccess("Successfully analyzed tables")
    } catch (err) {
      setError("Failed to analyze tables")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database Indexes</CardTitle>
        <CardDescription>Manage database indexes for improved query performance</CardDescription>
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
          <Alert variant="success" className="mb-4">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="mb-4">
          <div className="text-sm font-medium mb-2">Select Table</div>
          <div className="flex flex-wrap gap-2">
            {tables.map((table) => (
              <Button
                key={table}
                variant={selectedTable === table ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTable(table)}
              >
                {table}
              </Button>
            ))}
          </div>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Index Name</TableHead>
                <TableHead>Columns</TableHead>
                <TableHead>Unique</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : indexes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    No indexes found for this table
                  </TableCell>
                </TableRow>
              ) : (
                indexes.map((index) => (
                  <TableRow key={index.index_name}>
                    <TableCell className="font-mono text-xs">{index.index_name}</TableCell>
                    <TableCell className="font-mono text-xs">{index.column_names.join(", ")}</TableCell>
                    <TableCell>{index.is_unique ? "Yes" : "No"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => fetchIndexes(selectedTable)} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Refresh
        </Button>
        <div className="space-x-2">
          <Button onClick={analyzeTables} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Analyze Tables
          </Button>
          <Button onClick={createRecommendedIndexes} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Create Recommended Indexes
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
