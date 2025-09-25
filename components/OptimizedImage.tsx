"use client"

import { useState, useEffect, memo } from "react"
import Image, { type ImageProps } from "next/image"

interface OptimizedImageProps extends Omit<ImageProps, "onError"> {
  fallbackSrc?: string
  aspectRatio?: string
  priority?: boolean
}

function generateSimpleBlurDataURL(width = 700, height = 475, color = "#f3f4f6"): string {
  return `data:image/svg+xml;base64,${Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${color}"/></svg>`,
  ).toString("base64")}`
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  fallbackSrc = "/placeholder.svg",
  blurDataURL,
  aspectRatio = "16/9",
  className = "",
  priority = false,
  ...props
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [error, setError] = useState(false)

  // Defer image loading until component is mounted
  useEffect(() => {
    setImgSrc(src)
  }, [src])

  const blur = blurDataURL || generateSimpleBlurDataURL(700, 475)

  const handleError = () => {
    if (!error) {
      setImgSrc(fallbackSrc)
      setError(true)
    }
  }

  // Don't render anything until we have a source
  if (!imgSrc) return null

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio }}>
      <Image
        src={imgSrc || "/placeholder.svg"}
        alt={alt}
        fill
        className={`object-cover transition-opacity duration-300 ${error ? "opacity-70" : ""}`}
        onError={handleError}
        placeholder="blur"
        blurDataURL={blur}
        priority={priority}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        quality={80}
        {...props}
      />
    </div>
  )
})

export default OptimizedImage
