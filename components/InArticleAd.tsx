"use client"

import { AdComponent } from "./AdComponent"
import { AD_CONFIG } from "@/config/adConfig"
import { useMediaQuery } from "@/hooks/useMediaQuery"

interface InArticleAdProps {
  position?: "1" | "2"
  className?: string
}

export function InArticleAd({ position = "1", className = "" }: InArticleAdProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  const getAdUnit = () => {
    if (position === "1") {
      return isDesktop ? AD_CONFIG.gam.adUnits.desktopInArticle1 : AD_CONFIG.gam.adUnits.mobileInArticle1
    }
    return isDesktop ? AD_CONFIG.gam.adUnits.desktopInArticle2 : AD_CONFIG.gam.adUnits.mobileInArticle2
  }

  return (
    <div className={`w-full my-6 flex justify-center ${className}`}>
      <AdComponent
        adUnit={getAdUnit()}
        width={isDesktop ? 336 : 300}
        height={isDesktop ? 280 : 250}
        slotId={`in-article-${position}-${isDesktop ? "desktop" : "mobile"}`}
        responsiveSizes={AD_CONFIG.gam.responsiveSizes.inArticle}
        className="mx-auto"
        targeting={{
          position: `in-article-${position}`,
          device: isDesktop ? "desktop" : "mobile",
        }}
      />
    </div>
  )
}
