interface MobileAdPlaceholderProps {
  zoneId: string
  className?: string
}

export function MobileAdPlaceholder({ zoneId, className = "" }: MobileAdPlaceholderProps) {
  const isBelowHeaderOrTopBanner = zoneId === "mobile-below-header" || zoneId === "mobile-top-banner"

  const width = isBelowHeaderOrTopBanner ? 468 : 320
  const height = isBelowHeaderOrTopBanner ? 60 : 250

  return (
    <div
      className={`block md:hidden w-full max-w-[${width}px] h-[${height}px] bg-gray-200 flex items-center justify-center text-gray-600 text-sm mx-auto ${className}`}
    >
      Mobile Ad: {zoneId}
      <br />
      {width}x{height}
    </div>
  )
}
