"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle, Play, RefreshCw } from "lucide-react"

type Migration = {
  id: string
  name: string
  applied_at?: string
  applied_by?: string
}

type MigrationStatus = {
  applied: Migration[]
  pending: Migration[]
  total: number
  appliedCount: number
  pendingCount: number
}

export default function DatabaseMigrations() {
  const [status, setStatus] = useState<MigrationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fetch migration status
  const fetchStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/db/migrations")

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
    try {
      setApplying(true)
      setError(null)
      setSuccess(null)

      const response = await fetch("/api/db/migrations", {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to apply migrations")
      }

      const data = await response.json()
      setStatus(data.status)
      setSuccess("Migrations applied successfully")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setApplying(false)
    }
  }

  // Load migration status on mount
  useEffect(() => {
    fetchStatus()
  }, [])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Database Migrations</span>
          <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </CardTitle>
        <CardDescription>Manage database schema migrations</CardDescription>
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
          <Alert variant="success" className="bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : status ? (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="py-2">
                  <CardTitle className="text-sm font-medium">Total Migrations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{status.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-2">
                  <CardTitle className="text-sm font-medium">Applied</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">{status.appliedCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="py-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-amber-600">{status.pendingCount}</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="pending">
              <TabsList className="mb-4">
                <TabsTrigger value="pending">
                  Pending
                  {status.pendingCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {status.pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="applied">
                  Applied
                  {status.appliedCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {status.appliedCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                {status.pendingCount === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No pending migrations</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {status.pending.map((migration) => (
                      <div key={migration.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">{migration.name}</p>
                          <p className="text-sm text-muted-foreground">{migration.id}</p>
                        </div>
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                          Pending
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="applied">
                {status.appliedCount === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No applied migrations</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {status.applied.map((migration) => (
                      <div key={migration.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div>
                          <p className="font-medium">{migration.name}</p>
                          <p className="text-sm text-muted-foreground">{migration.id}</p>
                          {migration.applied_at && (
                            <p className="text-xs text-muted-foreground">
                              Applied at: {new Date(migration.applied_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
                          Applied
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button
          onClick={applyMigrations}
          disabled={loading || applying || status?.pendingCount === 0}
          className="w-full"
        >
          {applying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Applying Migrations...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Apply Pending Migrations
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
