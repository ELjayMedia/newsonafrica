import type React from "react"

interface DesktopAdSlotProps {
  id: string
  size: [number, number]
  className?: string
  placement: "top-banner" | "below-header" | "sidebar" | "in-article" | "footer-banner"
}

export const DesktopAdSlot: React.FC<DesktopAdSlotProps> = ({ id, size, className = "", placement }) => {
  const getPlacementStyles = () => {
    switch (placement) {
      case "top-banner":
        return "z-50"
      case "below-header":
        return "mt-4"
      case "sidebar":
        return "my-4"
      case "in-article":
        return "my-4"
      case "footer-banner":
        return "z-50"
      default:
        return ""
    }
  }

  return (
    <div
      id={`desktop-ad-slot-${id}`}
      className={`ad-slot bg-gray-200 flex items-center justify-center text-gray-500 text-sm hidden md:flex w-full max-w-[980px] mx-auto py-1 ${getPlacementStyles()} ${className}`}
      style={{ height: `${size[1]}px` }}
    >
      <p>
        Desktop Ad: {size[0]}x{size[1]} - {placement}
      </p>
    </div>
  )
}
