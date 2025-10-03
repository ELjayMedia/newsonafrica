import { Skeleton } from "@/components/ui/skeleton"
import { CountryEditionSkeleton } from "./CountryEditionSkeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
      </div>

      <CountryEditionSkeleton />
    </div>
  )
}
