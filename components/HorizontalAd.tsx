"use client"

import { AdComponent } from "./AdComponent"
import { AD_CONFIG } from "@/config/adConfig"
import { useMediaQuery } from "@/hooks/useMediaQuery"

interface HorizontalAdProps {
  position?: string
  className?: string
}

export function HorizontalAd({ position = "content", className = "" }: HorizontalAdProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const getAdUnit = () => {
    if (position === "below-header") {
      return isDesktop ? AD_CONFIG.gam.adUnits.desktopBelowHeader : AD_CONFIG.gam.adUnits.mobileBelowHeader
    }
    return isDesktop ? AD_CONFIG.gam.adUnits.desktopTopBanner : AD_CONFIG.gam.adUnits.mobileTopBanner
  }

  return (
    <div className={`w-full mx-auto overflow-hidden flex justify-center items-center ${className}`}>
      <AdComponent
        adUnit={getAdUnit()}
        width={isDesktop ? 728 : 320}
        height={isDesktop ? 90 : 50}
        slotId={`horizontal-ad-${position}-${isDesktop ? "desktop" : "mobile"}`}
        responsiveSizes={AD_CONFIG.gam.responsiveSizes.topBanner}
        className="w-full max-w-[980px]"
        targeting={{
          position: position,
          device: isDesktop ? "desktop" : "mobile",
        }}
      />
    </div>
  )
}
