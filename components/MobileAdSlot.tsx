import type React from "react"

interface MobileAdSlotProps {
  id: string
  size: [number, number]
  className?: string
  placement: "top-banner" | "below-header" | "in-article" | "footer-banner"
}

export const MobileAdSlot: React.FC<MobileAdSlotProps> = ({ id, size, className = "", placement }) => {
  const getPlacementStyles = () => {
    switch (placement) {
      case "top-banner":
        return "z-50"
      case "below-header":
        return "mt-4"
      case "in-article":
        return "my-4"
      case "footer-banner":
        return "z-50"
      default:
        return ""
    }
  }

  const adSize = placement === "below-header" ? [320, 50] : size

  return (
    <div
      id={`mobile-ad-slot-${id}`}
      className={`ad-slot bg-gray-200 flex items-center justify-center text-gray-500 text-xs md:hidden w-full ${getPlacementStyles()} ${className}`}
      style={{ height: `${adSize[1]}px` }}
    >
      <p>
        Mobile Ad: {adSize[0]}x{adSize[1]} - {placement}
      </p>
    </div>
  )
}
