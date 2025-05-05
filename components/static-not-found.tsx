import Link from "next/link"

export default function StaticNotFound() {
  // This component uses no client hooks and is safe for server rendering
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-16 text-center">
      <h1 className="text-7xl font-bold text-gray-900">404</h1>
      <h2 className="mt-4 text-2xl font-semibold text-gray-700">Page Not Found</h2>
      <p className="mt-4 text-lg text-gray-600">Sorry, we couldn't find the page you're looking for.</p>
      <div className="mt-8">
        <Link href="/" className="px-6 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
          Return to Homepage
        </Link>
      </div>
    </div>
  )
}
