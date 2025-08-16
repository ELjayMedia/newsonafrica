import { AdComponent } from "./AdComponent"

interface HorizontalAdProps {
  zoneId: string
  className?: string
}

export function HorizontalAd({ zoneId, className = "" }: HorizontalAdProps) {
  return (
    <div className={`w-full mx-auto overflow-hidden flex justify-center items-center ${className}`}>
      <AdComponent zoneId={zoneId} className="w-full max-w-[980px]" />
    </div>
  )
}
