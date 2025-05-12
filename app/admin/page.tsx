import type { Metadata } from "next"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserManagement } from "@/components/admin/UserManagement"
import { SetupBookmarks } from "@/components/admin/SetupBookmarks"
import { PromoteAdmin } from "@/components/admin/PromoteAdmin"
import { SetupRLS } from "@/components/admin/SetupRLS"

export const metadata: Metadata = {
  title: "Admin Dashboard | News on Africa",
  description: "Admin dashboard for News on Africa",
}

export default async function AdminPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  // Get the current user session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth?callbackUrl=/admin")
  }

  // Get user with their role from the database
  const { data: userData, error: userError } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", session.user.id)
    .single()

  if (userError || !userData) {
    console.error("Error fetching user role:", userError)
    redirect("/")
  }

  // Check if user has admin role
  if (userData.role !== "admin") {
    redirect("/")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <p className="text-blue-700">
          Logged in as: <strong>{userData.full_name || userData.email}</strong> (Admin)
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="system">System Setup</TabsTrigger>
          <TabsTrigger value="content">Content Management</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <SetupBookmarks />
              <PromoteAdmin />
            </div>
            <div>
              <SetupRLS />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Content Management</h2>
            <p className="text-gray-600">
              Content management features will be implemented in a future update. This will include:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
              <li>Comment moderation</li>
              <li>Featured content management</li>
              <li>Content analytics</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
