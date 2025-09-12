"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { useGoogleAds } from "@/hooks/useGoogleAds"
import { useMediaQuery } from "@/hooks/useMediaQuery"

interface AdSlotProps {
  adUnit: string
  width: number
  height: number
  slotId: string
  responsiveSizes?: number[][]
  className?: string
  fallbackContent?: React.ReactNode
  mobileAdUnit?: string
  mobileWidth?: number
  mobileHeight?: number
  mobileResponsiveSizes?: number[][]
}

export const AdSlot: React.FC<AdSlotProps> = ({
  adUnit,
  width,
  height,
  slotId,
  responsiveSizes,
  className = "",
  fallbackContent,
  mobileAdUnit,
  mobileWidth,
  mobileHeight,
  mobileResponsiveSizes,
}) => {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const adRef = useRef<HTMLDivElement>(null)

  // Determine which ad configuration to use
  const currentAdUnit = isMobile && mobileAdUnit ? mobileAdUnit : adUnit
  const currentWidth = isMobile && mobileWidth ? mobileWidth : width
  const currentHeight = isMobile && mobileHeight ? mobileHeight : height
  const currentResponsiveSizes = isMobile && mobileResponsiveSizes ? mobileResponsiveSizes : responsiveSizes

  const { isLoaded, hasError, refreshAd } = useGoogleAds({
    adUnit: currentAdUnit,
    width: currentWidth,
    height: currentHeight,
    slotId,
    responsiveSizes: currentResponsiveSizes,
  })

  // Handle visibility changes to refresh ads when they come back into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && isLoaded) {
            // Optionally refresh ad when it comes into view
            // refreshAd()
          }
        })
      },
      { threshold: 0.1 },
    )

    if (adRef.current) {
      observer.observe(adRef.current)
    }

    return () => {
      if (adRef.current) {
        observer.unobserve(adRef.current)
      }
    }
  }, [isLoaded, refreshAd])

  // Default fallback content
  const defaultFallback = (
    <div
      className="bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 text-sm"
      style={{ width: currentWidth, height: currentHeight }}
    >
      Advertisement
    </div>
  )

  return (
    <div
      ref={adRef}
      className={`ad-container ${className}`}
      style={{
        minWidth: currentWidth,
        minHeight: currentHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Ad slot div - this is where GPT will render the ad */}
      <div
        id={slotId}
        style={{
          width: currentWidth,
          height: currentHeight,
          display: hasError ? "none" : "block",
        }}
      />

      {/* Fallback content when ad fails to load */}
      {hasError && (fallbackContent || defaultFallback)}

      {/* Loading state */}
      {!isLoaded && !hasError && (
        <div
          className="bg-gray-50 animate-pulse flex items-center justify-center text-gray-400 text-xs"
          style={{ width: currentWidth, height: currentHeight }}
        >
          Loading ad...
        </div>
      )}
    </div>
  )
}

// Predefined ad slot components for common use cases
export const TopBannerAd: React.FC<{ className?: string }> = ({ className }) => (
  <AdSlot
    adUnit="/newsonafrica/web/homepage/top-banner"
    width={728}
    height={90}
    slotId="div-gpt-ad-home-top"
    responsiveSizes={[
      [728, 90],
      [320, 50],
    ]}
    mobileAdUnit="/newsonafrica/mobile/homepage/top-banner"
    mobileWidth={320}
    mobileHeight={50}
    className={className}
  />
)

export const SidebarAd: React.FC<{ className?: string }> = ({ className }) => (
  <AdSlot
    adUnit="/newsonafrica/web/sidebar/rectangle"
    width={300}
    height={250}
    slotId="div-gpt-ad-sidebar"
    responsiveSizes={[
      [300, 250],
      [320, 50],
    ]}
    mobileAdUnit="/newsonafrica/mobile/inline/banner"
    mobileWidth={320}
    mobileHeight={50}
    className={className}
  />
)

export const InArticleAd: React.FC<{ className?: string }> = ({ className }) => (
  <AdSlot
    adUnit="/newsonafrica/web/article/inline"
    width={728}
    height={90}
    slotId="div-gpt-ad-article-inline"
    responsiveSizes={[
      [728, 90],
      [320, 50],
    ]}
    mobileAdUnit="/newsonafrica/mobile/article/inline"
    mobileWidth={320}
    mobileHeight={50}
    className={className}
  />
)
