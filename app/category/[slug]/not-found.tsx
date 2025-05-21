import Link from "next/link"

export default function CategoryNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <h1 className="text-3xl font-bold mb-4">Category Not Found</h1>
      <p className="text-gray-600 mb-8 text-center">
        We couldn't find the category you're looking for. It may have been removed or renamed.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/"
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-center"
        >
          Return to Home
        </Link>
        <Link
          href="/search"
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors text-center"
        >
          Search for Content
        </Link>
      </div>
    </div>
  )
}
