import { HeroSkeleton } from "../(home)/HeroSkeleton"
import { LatestGridSkeleton } from "../(home)/LatestGridSkeleton"
import { TrendingSkeleton } from "../(home)/TrendingSkeleton"

export default function Loading() {
  return (
    <main className="container mx-auto space-y-12 px-4 py-8">
      <section>
        <HeroSkeleton />
      </section>

      <section>
        <TrendingSkeleton />
      </section>

      <section>
        <LatestGridSkeleton />
      </section>
    </main>
  )
}
