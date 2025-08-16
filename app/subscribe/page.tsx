import type { Metadata } from "next"
import { SubscribeContent } from "@/components/SubscribeContent"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Subscribe to News On Africa",
  description: "Choose your subscription plan and get unlimited access to Africa's trusted news source",
}

export default function SubscribePage() {
  return (
    <Suspense fallback={<SubscriptionSkeleton />}>
      <SubscribeContent />
    </Suspense>
  )
}

function SubscriptionSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 animate-pulse">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
        </div>

        <div className="mb-8 flex justify-center">
          <div className="flex items-center">
            <div className="rounded-full h-8 w-8 bg-gray-200 flex items-center justify-center"></div>
            <div className="w-24 h-1 mx-2 bg-gray-200"></div>
            <div className="rounded-full h-8 w-8 bg-gray-200 flex items-center justify-center"></div>
            <div className="w-24 h-1 mx-2 bg-gray-200"></div>
            <div className="rounded-full h-8 w-8 bg-gray-200 flex items-center justify-center"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
