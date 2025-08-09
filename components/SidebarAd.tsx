import { AdErrorBoundary } from "@/components/AdErrorBoundary"
import { AdSense } from "@/components/AdSense"

interface SidebarAdProps {
  slot: string

  format?: string
  className?: string
}

export function SidebarAd({
  slot,
  format = "rectangle",
  className = "w-full min-w-[300px] h-[250px]",
}: SidebarAdProps) {
  return (
    <AdErrorBoundary collapse>
      <AdSense slot={slot} format={format} className={className} />
    </AdErrorBoundary>

  )
}
