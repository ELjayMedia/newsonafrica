import type { Metadata } from "next"
import { Suspense } from "react"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { SubscriptionsContent } from "@/components/SubscriptionsContent"

export const metadata: Metadata = {
  title: "Manage Subscriptions",
  description: "Manage your News On Africa subscriptions and payment methods.",
}

export default async function SubscriptionsPage() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth?redirectTo=/subscriptions")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Manage Your Subscriptions</h1>

      <Suspense fallback={<div className="h-96 bg-gray-100 rounded-md"></div>}>
        <SubscriptionsContent userId={session.user.id} />
      </Suspense>
    </div>
  )
}
