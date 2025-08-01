"use client"

import { useEffect, useRef, useState, memo } from "react"
import { useInView } from "react-intersection-observer"

interface AdSenseProps {
  slot: string
  format?: "auto" | "horizontal" | "vertical" | "rectangle"
  responsive?: "true" | "false"
  className?: string
  lazyLoad?: boolean
  id?: string
  minWidth?: number
}

// Keep track of initialized ad slots globally
const initializedAds = new Set<string>()

export const AdSense = memo(function AdSense({
  slot,
  format = "auto",
  responsive = "true",
  className = "",
  lazyLoad = true,
  id = `ad-${Math.random().toString(36).substring(2, 9)}`,
  minWidth = format === "horizontal" ? 728 : 300,
}: AdSenseProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAdFilled, setIsAdFilled] = useState(false)
  const [containerTooSmall, setContainerTooSmall] = useState(false)
  const adRef = useRef<HTMLDivElement>(null)
  const initAttempted = useRef(false)
  const adScriptLoaded = useRef(false)
  const checkTimer = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // Use intersection observer to load ads only when visible
  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: true,
    rootMargin: "200px 0px", // Load ads 200px before they come into view
  })

  // Set dimensions based on format
  const dimensions = {
    auto: { minWidth: "300px", minHeight: "250px" },
    horizontal: { minWidth: "728px", minHeight: "90px" },
    vertical: { minWidth: "300px", minHeight: "600px" },
    rectangle: { minWidth: "300px", minHeight: "250px" },
  }[format]

  // Combine refs
  const setRefs = (element: HTMLDivElement | null) => {
    // Set both the intersection observer ref and our container ref
    containerRef.current = element
    ref(element)

    // Measure container width immediately
    if (element) {
      setContainerWidth(element.clientWidth)
    }
  }

  // Check container size before initializing ad
  const checkContainerSize = () => {
    if (!containerRef.current) return false

    const width = containerRef.current.clientWidth
    setContainerWidth(width)

    // If container is too small for the ad format
    if (width < minWidth) {
      console.log(`Container too small for ad: ${width}px < ${minWidth}px minimum`)
      setContainerTooSmall(true)
      return false
    }

    setContainerTooSmall(false)
    return true
  }

  // Load AdSense script once
  useEffect(() => {
    if (typeof window === "undefined" || adScriptLoaded.current) return

    // Check if script is already loaded
    if (document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) {
      adScriptLoaded.current = true
      return
    }

    const script = document.createElement("script")
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6089753674605524"
    script.async = true
    script.crossOrigin = "anonymous"
    script.onload = () => {
      adScriptLoaded.current = true
    }
    document.head.appendChild(script)
  }, [])

  // Check container size on mount and resize
  useEffect(() => {
    // Check size immediately
    checkContainerSize()

    // Add resize listener
    const handleResize = () => {
      checkContainerSize()
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Check if ad is filled
  const checkAdFilled = () => {
    if (!adRef.current) return false

    const adElement = adRef.current.querySelector("ins.adsbygoogle")
    if (!adElement) return false

    // Check various indicators that the ad is filled
    const status = adElement.getAttribute("data-ad-status")
    const hasContent = adElement.innerHTML.trim() !== ""
    const hasHeight = adElement.offsetHeight > 10

    const isFilled = status === "filled" || (hasContent && hasHeight)
    setIsAdFilled(isFilled)

    return isFilled
  }

  // Initialize ad when in view and script is loaded
  useEffect(() => {
    // Only initialize once and only when in view
    if (!inView || initAttempted.current || typeof window === "undefined") return

    // Check if this ad ID has already been initialized
    if (initializedAds.has(id)) {
      console.log(`Ad ${id} already initialized, skipping`)
      setIsLoading(false)
      return
    }

    // Check container size first
    if (!checkContainerSize()) {
      setIsLoading(false)
      return
    }

    initAttempted.current = true
    setIsLoading(true)

    const initAd = () => {
      if (!adRef.current) return

      try {
        // Check if this specific ad slot is already filled
        if (checkAdFilled()) {
          setIsLoading(false)
          return
        }

        // Mark this ad as initialized
        initializedAds.add(id)

        // Initialize the ad
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})

        // Set up checks to see if the ad was filled
        if (checkTimer.current) clearTimeout(checkTimer.current)

        // First check after a short delay
        checkTimer.current = setTimeout(() => {
          const filled = checkAdFilled()

          // If not filled on first check, try again after a longer delay
          if (!filled) {
            checkTimer.current = setTimeout(() => {
              checkAdFilled()
              setIsLoading(false)
            }, 2000)
          } else {
            setIsLoading(false)
          }
        }, 500)
      } catch (err) {
        console.error("Error initializing ad:", err)
        setIsLoading(false)
      }
    }

    // Wait for script to load if needed
    if (adScriptLoaded.current) {
      // Add a small delay to ensure DOM is ready
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(initAd, 100)
    } else {
      // Check periodically if script has loaded
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => {
        if (adScriptLoaded.current) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          timeoutRef.current = setTimeout(initAd, 100)
        }
      }, 200)

      // Clear interval and finish loading after timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setIsLoading(false)
      }, 5000)
    }

    // Cleanup
    return () => {
      if (checkTimer.current) clearTimeout(checkTimer.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [inView, format, minWidth, id])

  // If container is too small, don't render the ad
  if (containerTooSmall) {
    return null
  }

  // If ad is not filled and not loading, return null to collapse the space
  if (!isLoading && !isAdFilled) return null

  return (
    <div ref={setRefs} className={`ad-container ${className}`} id={id}>
      {inView && containerWidth >= minWidth ? (
        <div
          ref={adRef}
          className={`adsense-container ${isLoading ? "min-h-[250px] bg-gray-50 animate-pulse rounded" : ""}`}
          style={{
            display: "block",
            overflow: "hidden",
            minWidth: dimensions.minWidth,
          }}
        >
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <span className="text-sm text-gray-400">Loading ad...</span>
            </div>
          )}
          <ins
            className="adsbygoogle"
            style={{
              display: "block",
              width: "100%",
              height: isLoading ? "0" : "100%",
              minHeight: isLoading ? "0" : dimensions.minHeight,
              opacity: isLoading ? 0 : 1,
            }}
            data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-6089753674605524"}
            data-ad-slot={slot}
            data-ad-format={format}
            data-full-width-responsive={responsive}
          />
        </div>
      ) : (
        // Empty div when not in view yet or container too small
        <div className="ad-placeholder" style={{ height: "0", overflow: "hidden" }} />
      )}
    </div>
  )
})

export default AdSense
