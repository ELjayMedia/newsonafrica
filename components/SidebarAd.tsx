import { AdErrorBoundary } from "./AdErrorBoundary"
import { AdSense } from "./AdSense"

interface SidebarAdProps {
  slot: string
}

export function SidebarAd({ slot }: SidebarAdProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <AdErrorBoundary collapse={true}>
        <AdSense slot={slot} format="rectangle" className="w-full min-w-[300px] h-[250px]" />
      </AdErrorBoundary>
    </div>
  )
}
