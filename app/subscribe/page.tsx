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
    <div className="space-y-10">
      <div className="space-y-4 text-center">
        <div className="mx-auto h-8 w-1/2 rounded bg-gray-200" />
        <div className="mx-auto h-4 w-3/4 rounded bg-gray-200" />
      </div>
      <div className="flex justify-center">
        <div className="flex items-center gap-4">
          {[0, 1, 2].map((step) => (
            <div key={step} className="flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200" />
              {step < 2 && <div className="h-1 w-20 bg-gray-200" />}
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-4 h-6 w-1/2 rounded bg-gray-200" />
            <div className="mb-2 h-4 w-full rounded bg-gray-200" />
            <div className="mb-4 h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-10 w-full rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  )
}
