import Link from "next/link"

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-3xl font-bold mb-4">You're offline</h1>
      <p className="mb-6 text-gray-600">
        It looks like you're currently offline. Please check your internet connection and try again.
      </p>
      <div className="p-8 mb-6 bg-gray-100 rounded-lg">
        <p className="text-lg font-medium">Some content is available offline</p>
        <p className="text-sm text-gray-500 mt-2">Articles you've previously viewed may still be accessible.</p>
      </div>
      <Link href="/" className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors">
        Try again
      </Link>
    </div>
  )
}
