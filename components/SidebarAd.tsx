import { AdErrorBoundary } from "./AdErrorBoundary"
import { AdSense } from "./AdSense"

export function SidebarAd() {
  return (
    <div className="hidden md:block w-full">
      <AdErrorBoundary collapse={true}>
        <AdSense slot="4567890123" format="rectangle" className="mx-auto" minWidth={300} />
      </AdErrorBoundary>
    </div>
  )
}
