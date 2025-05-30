"use client"

import { AdComponent } from "./AdComponent"
import { AD_CONFIG } from "@/config/adConfig"
import { useMediaQuery } from "@/hooks/useMediaQuery"

export function FooterBannerAd() {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  return (
    <div className="w-full my-4 flex justify-center">
      <AdComponent
        adUnit={isDesktop ? AD_CONFIG.gam.adUnits.desktopFooterBanner : AD_CONFIG.gam.adUnits.mobileFooterBanner}
        width={isDesktop ? 728 : 320}
        height={isDesktop ? 90 : 50}
        slotId={`footer-banner-${isDesktop ? "desktop" : "mobile"}`}
        responsiveSizes={AD_CONFIG.gam.responsiveSizes.topBanner}
        className="max-w-full overflow-hidden"
        targeting={{
          position: "footer-banner",
          device: isDesktop ? "desktop" : "mobile",
        }}
      />
    </div>
  )
}
