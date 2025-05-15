import { Suspense } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import SetupRLS from "@/components/admin/SetupRLS"
import SetupNotifications from "@/components/admin/SetupNotifications"
import DatabaseMigrations from "@/components/admin/DatabaseMigrations"

export default function AdminPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <Tabs defaultValue="migrations">
        <TabsList className="mb-4">
          <TabsTrigger value="migrations">Database Migrations</TabsTrigger>
          <TabsTrigger value="setup">Setup Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="migrations">
          <Suspense fallback={<div>Loading migrations...</div>}>
            <DatabaseMigrations />
          </Suspense>
        </TabsContent>

        <TabsContent value="setup">
          <div className="grid gap-6">
            <SetupRLS />
            <SetupNotifications />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
