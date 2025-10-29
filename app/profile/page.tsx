import { Suspense } from "react"
import { createClient } from "@/utils/supabase/server"
import ProfileContent from "@/components/ProfileContent"
import { Skeleton } from "@/components/ui/skeleton"
import { ProfileDropdown } from "@/components/ProfileDropdown"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "My Profile - News On Africa",
  description: "View and edit your News On Africa profile",
}

export default async function ProfilePage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold md:block hidden">My Profile</h1>
        {/* Conditionally render the ProfileDropdown */}
        {session?.user && (
          <div className="hidden md:block">
            <ProfileDropdown />
          </div>
        )}
      </div>

      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent initialSession={session} />
      </Suspense>
    </main>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      <div className="space-y-4 mt-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>

      <Skeleton className="h-10 w-32 mt-4" />
    </div>
  )
}
