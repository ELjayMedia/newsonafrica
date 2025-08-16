interface DesktopAdPlaceholderProps {
  zoneId: string
  className?: string
}

export function DesktopAdPlaceholder({ zoneId, className = "" }: DesktopAdPlaceholderProps) {
  const isSkyscraper = zoneId === "sidebar"
  const width = isSkyscraper ? 300 : 728
  const height = isSkyscraper ? 600 : 90

  return (
    <div
      className={`hidden md:flex w-full ${
        isSkyscraper ? "max-w-[300px] h-[600px]" : "max-w-[728px] h-[90px]"
      } bg-gray-200 items-center justify-center text-gray-600 text-sm mx-auto py-1 ${className}`}
    >
      Desktop Ad: {zoneId}
      <br />
      {width}x{height}
    </div>
  )
}
