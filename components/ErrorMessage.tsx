import Link from "next/link"

interface ErrorMessageProps {
  message: string
  showHomeLink?: boolean
}

export function ErrorMessage({ message, showHomeLink = true }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
        <h2 className="text-xl font-semibold text-red-700 mb-2">Something went wrong</h2>
        <p className="text-gray-700 mb-4">{message}</p>
        {showHomeLink && (
          <Link href="/" className="text-blue-600 hover:underline">
            Return to homepage
          </Link>
        )}
      </div>
    </div>
  )
}
