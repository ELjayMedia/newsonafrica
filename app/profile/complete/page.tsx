import { Suspense } from "react"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import ProfileCompletionContent from "@/components/ProfileCompletionContent"
import { Skeleton } from "@/components/ui/skeleton"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Complete Your Profile - News On Africa",
  description: "Complete your profile to get the most out of News On Africa",
}

export const dynamic = "force-dynamic"

export default async function ProfileCompletionPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If no session, this will be handled by middleware redirecting to login

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Complete Your Profile</h1>

        <div className="bg-white rounded-lg shadow-md p-6">
          <Suspense fallback={<ProfileCompletionSkeleton />}>
            <ProfileCompletionContent initialSession={session} />
          </Suspense>
        </div>
      </div>
    </main>
  )
}

function ProfileCompletionSkeleton() {
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
      </div>

      <Skeleton className="h-10 w-32 mt-4" />
    </div>
  )
}
