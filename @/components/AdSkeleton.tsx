export function AdSkeleton() {
  return (
    <div className="animate-pulse bg-gray-200 rounded-md w-full" style={{ height: "250px" }}>
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-gray-400">Loading advertisement...</div>
      </div>
    </div>
  )
}
