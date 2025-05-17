"use client"

import { useState, useEffect } from "react"
import { useUser } from "@supabase/auth-helpers-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, CheckCircle, AlertCircle, Database, ArrowUpCircle } from "lucide-react"
import migrations from "@/data/migrations" // Declare the migrations variable

interface MigrationStatus {
  currentVersion: string
  availableVersion: string
  pendingMigrations: string[]
  appliedMigrations: {
    version: string
    description: string
    appliedAt: string
    status: string
  }[]
  isUpToDate: boolean
}

interface MigrationResult {
  version: string
  description: string
  status: "success" | "error" | "skipped"
  executionTime?: number
  error?: string
}

export default function SchemaVersions() {
  const [status, setStatus] = useState<MigrationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [results, setResults] = useState<MigrationResult[] | null>(null)
  const user = useUser()

  // Fetch migration status
  const fetchStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/db/schema-versions")

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch migration status")
      }

      const data = await response.json()
      setStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  // Apply pending migrations
  const applyMigrations = async () => {
    if (!user) {
      setError("You must be logged in to apply migrations")
      return
    }

    try {
      setApplying(true)
      setError(null)
      setSuccess(null)
      setResults(null)

      const response = await fetch("/api/db/schema-versions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to apply migrations")
      }

      setStatus(data.status)
      setResults(data.results)
      setSuccess("Migrations applied successfully")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setApplying(false)
    }
  }

  // Load migration status on mount
  useEffect(() => {
    fetchStatus()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Success</Badge>
      case "error":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Error</Badge>
      case "skipped":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Skipped</Badge>
      default:
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">{status}</Badge>
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Database className="mr-2 h-5 w-5" />
            Database Schema Versions
          </span>
          <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </CardTitle>
        <CardDescription>Manage database schema versions and migrations</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : success ? (
          <Alert className="mb-4 bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}

        {status && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader className="py-2">
                  <CardTitle className="text-sm font-medium">Current Version</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{status.currentVersion}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-2">
                  <CardTitle className="text-sm font-medium">Latest Available</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <p className="text-2xl font-bold">{status.availableVersion}</p>
                    {status.isUpToDate ? (
                      <CheckCircle className="ml-2 h-5 w-5 text-green-500" />
                    ) : (
                      <ArrowUpCircle className="ml-2 h-5 w-5 text-amber-500" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {results && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Migration Results:</h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Version
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {results.map((result) => (
                        <tr key={result.version}>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{result.version}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">{result.description}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">{getStatusBadge(result.status)}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {result.executionTime ? `${(result.executionTime / 1000).toFixed(2)}s` : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {results.some((r) => r.status === "error") && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Migration Errors</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-5 mt-2">
                        {results
                          .filter((r) => r.status === "error")
                          .map((r) => (
                            <li key={r.version}>
                              <strong>{r.version}:</strong> {r.error}
                            </li>
                          ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <Tabs defaultValue="pending">
              <TabsList className="mb-4">
                <TabsTrigger value="pending">
                  Pending Migrations
                  {status.pendingMigrations.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {status.pendingMigrations.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="applied">
                  Applied Migrations
                  {status.appliedMigrations.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {status.appliedMigrations.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                {status.pendingMigrations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p>Database schema is up to date</p>
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Version
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {status.pendingMigrations.map((version) => {
                          const migration = migrations.find((m) => m.version === version)
                          return (
                            <tr key={version}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{version}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                {migration?.description || "Unknown migration"}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="applied">
                {status.appliedMigrations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No migrations have been applied yet</p>
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Version
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Applied At
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {status.appliedMigrations.map((migration) => (
                          <tr key={migration.version}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{migration.version}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">{migration.description}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              {new Date(migration.appliedAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">{getStatusBadge(migration.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={applyMigrations}
          disabled={loading || applying || !status || status.pendingMigrations.length === 0}
          className="w-full"
        >
          {applying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Applying Migrations...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Apply Pending Migrations
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
