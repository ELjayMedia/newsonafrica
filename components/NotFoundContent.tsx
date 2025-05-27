import Link from "next/link"

export default function NotFoundContent() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-6xl font-bold mb-2">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <div className="h-1 w-20 bg-black mx-auto mb-6"></div>
        <p className="mb-8 text-gray-600">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
        >
          Return to Homepage
        </Link>
      </div>
    </div>
  )
}
