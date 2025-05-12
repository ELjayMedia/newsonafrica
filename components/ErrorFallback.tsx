"use client"

export default function ErrorFallback() {
  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
      <h2 className="text-lg font-semibold text-amber-800">Component Failed to Load</h2>
      <p className="text-sm text-amber-600 mt-1">
        We're having trouble loading this component. Please try refreshing the page.
      </p>
      <button
        className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
        onClick={() => window.location.reload()}
      >
        Refresh Page
      </button>
    </div>
  )
}
