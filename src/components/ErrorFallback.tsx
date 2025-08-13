'use client';
import Link from 'next/link';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export default function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-md">
          <p className="text-sm text-gray-700">
            {error.message || 'An unexpected error occurred. Please try again later.'}
          </p>
        </div>
        <div className="flex flex-col space-y-3">
          <button
            onClick={resetErrorBoundary}
            className="w-full py-2 px-4 bg-black text-white rounded hover:bg-gray-800 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded text-center hover:bg-gray-300 transition-colors"
          >
            Return to home page
          </Link>
        </div>
      </div>
    </div>
  );
}
