import type React from "react"
import { AdSlot } from "./AdSlot"

interface AdPlacementProps {
  id: string
  mobileSize: [number, number]
  desktopSize: [number, number]
  className?: string
  placement: "top-banner" | "below-header" | "sidebar" | "in-article" | "footer-banner"
}

export const AdPlacement: React.FC<AdPlacementProps> = ({ id, mobileSize, desktopSize, className = "", placement }) => {
  return (
    <AdSlot id={id} mobileSize={mobileSize} desktopSize={desktopSize} className={className} placement={placement} />
  )
}
