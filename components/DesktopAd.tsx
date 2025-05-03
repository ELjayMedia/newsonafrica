import { DesktopAdPlaceholder } from "./DesktopAdPlaceholder"

interface DesktopAdProps {
  zoneId: string
  className?: string
}

export function DesktopAd({ zoneId, className = "" }: DesktopAdProps) {
  return (
    <div className={`hidden md:block w-full mx-auto overflow-hidden flex justify-center items-center ${className}`}>
      <DesktopAdPlaceholder zoneId={zoneId} />
    </div>
  )
}
