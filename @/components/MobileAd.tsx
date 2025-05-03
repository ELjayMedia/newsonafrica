import { MobileAdPlaceholder } from "./MobileAdPlaceholder"

interface MobileAdProps {
  zoneId: string
  className?: string
}

export function MobileAd({ zoneId, className = "" }: MobileAdProps) {
  const isBelowHeaderOrTopBanner = zoneId === "mobile-below-header" || zoneId === "mobile-top-banner"
  const maxWidth = isBelowHeaderOrTopBanner ? "max-w-[468px]" : "max-w-[320px]"

  return (
    <div
      className={`block md:hidden w-full mx-auto overflow-hidden flex justify-center items-center ${maxWidth} ${className}`}
    >
      <MobileAdPlaceholder zoneId={zoneId} />
    </div>
  )
}
