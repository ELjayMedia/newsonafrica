import type React from "react"
import { MobileAdSlot } from "./MobileAdSlot"
import { DesktopAdSlot } from "./DesktopAdSlot"

interface AdSlotProps {
  id: string
  mobileSize: [number, number]
  desktopSize: [number, number]
  className?: string
  placement: "top-banner" | "below-header" | "sidebar" | "in-article" | "footer-banner" | "in-category"
}

export const AdSlot: React.FC<AdSlotProps> = ({ id, mobileSize, desktopSize, className = "", placement }) => {
  return (
    <>
      <MobileAdSlot id={id} size={mobileSize} className={className} placement={placement} />
      <DesktopAdSlot id={id} size={desktopSize} className={className} placement={placement} />
    </>
  )
}
