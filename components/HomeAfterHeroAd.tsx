"use client"

import { AdComponent } from "./AdComponent"
import { AD_CONFIG } from "@/config/adConfig"
import { useMediaQuery } from "@/hooks/useMediaQuery"

export function HomeAfterHeroAd() {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  return (
    <div className="w-full my-6 flex justify-center">
      <AdComponent
        adUnit={isDesktop ? AD_CONFIG.gam.adUnits.desktopHomeAfterHero : AD_CONFIG.gam.adUnits.mobileHomeAfterHero}
        width={isDesktop ? 468 : 300}
        height={isDesktop ? 60 : 250}
        slotId={`home-after-hero-${isDesktop ? "desktop" : "mobile"}`}
        responsiveSizes={[
          [468, 60],
          [300, 250],
          [320, 50],
        ]}
        className="mx-auto"
        targeting={{
          position: "home-after-hero",
          device: isDesktop ? "desktop" : "mobile",
          page_type: "homepage",
        }}
      />
    </div>
  )
}
