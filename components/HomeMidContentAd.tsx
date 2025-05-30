"use client"

import { AdComponent } from "./AdComponent"
import { AD_CONFIG } from "@/config/adConfig"
import { useMediaQuery } from "@/hooks/useMediaQuery"

export function HomeMidContentAd() {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  return (
    <div className="w-full my-8 flex justify-center">
      <AdComponent
        adUnit={isDesktop ? AD_CONFIG.gam.adUnits.desktopHomeMidContent : AD_CONFIG.gam.adUnits.mobileHomeMidContent}
        width={isDesktop ? 468 : 300}
        height={isDesktop ? 60 : 250}
        slotId={`home-mid-content-${isDesktop ? "desktop" : "mobile"}`}
        responsiveSizes={[
          [468, 60],
          [300, 250],
          [320, 50],
        ]}
        className="mx-auto"
        targeting={{
          position: "home-mid-content",
          device: isDesktop ? "desktop" : "mobile",
          page_type: "homepage",
        }}
      />
    </div>
  )
}
