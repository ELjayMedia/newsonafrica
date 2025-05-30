"use client"

import { AdComponent } from "./AdComponent"
import { AD_CONFIG } from "@/config/adConfig"
import { useMediaQuery } from "@/hooks/useMediaQuery"

export function TopBannerAd() {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  return (
    <div className="w-full my-2 flex justify-center">
      <AdComponent
        adUnit={isDesktop ? AD_CONFIG.gam.adUnits.desktopTopBanner : AD_CONFIG.gam.adUnits.mobileTopBanner}
        width={isDesktop ? 728 : 320}
        height={isDesktop ? 90 : 50}
        slotId={`top-banner-${isDesktop ? "desktop" : "mobile"}`}
        responsiveSizes={AD_CONFIG.gam.responsiveSizes.topBanner}
        className="max-w-full overflow-hidden"
        targeting={{
          position: "top-banner",
          device: isDesktop ? "desktop" : "mobile",
        }}
      />
    </div>
  )
}
