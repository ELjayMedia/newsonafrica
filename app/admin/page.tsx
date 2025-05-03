import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { SetupRLS } from "@/components/admin/SetupRLS"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth?redirectTo=/admin")
  }

  // In a real app, you would check if the user has admin privileges
  // For now, we'll just allow any authenticated user to access this page

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Database Configuration</h2>
          <SetupRLS />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="p-4 border rounded-lg">
            <p className="text-sm text-gray-500 mb-4">
              This is a simplified admin dashboard. In a production environment, you would have more comprehensive
              management tools here.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
