"use client"

import { useState, useEffect, memo } from "react"
import Image, { type ImageProps } from "next/image"
import { generateBlurDataURL } from "@/utils/lazy-load"

interface OptimizedImageProps extends Omit<ImageProps, "onError"> {
  fallbackSrc?: string
  aspectRatio?: string
  priority?: boolean
  loading?: "lazy" | "eager"
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  fallbackSrc = "/placeholder.svg",
  blurDataURL,
  aspectRatio = "16/9",
  className = "",
  priority = false,
  loading = "lazy",
  sizes,
  width,
  height,
  ...props
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src)
  const [error, setError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setImgSrc(src)
    setError(false)
    setIsLoading(true)
  }, [src])

  const blur = blurDataURL || generateBlurDataURL(700, 475)

  const handleError = () => {
    if (!error) {
      setImgSrc(fallbackSrc)
      setError(true)
      setIsLoading(false)
    }
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  const responsiveSizes = sizes || "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  const useFill = width === undefined || height === undefined

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={useFill ? { aspectRatio } : undefined}
    >
      <Image
        src={imgSrc || "/placeholder.svg"}
        alt={alt}
        {...(useFill ? { fill: true } : { width, height })}
        className={`object-cover transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        } ${error ? "opacity-70" : ""}`}
        onError={handleError}
        onLoad={handleLoad}
        placeholder="blur"
        blurDataURL={blur}
        priority={priority}
        loading={loading}
        sizes={responsiveSizes}
        quality={85}
        {...props}
      />
    </div>
  )
})

export default OptimizedImage
