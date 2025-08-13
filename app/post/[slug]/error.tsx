'use client';

import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

interface PostErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PostError({ error, reset }: PostErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Post page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-6">
            We encountered an error while loading this article. This might be a temporary issue.
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={reset} className="w-full" variant="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>

          <Button onClick={() => (window.location.href = '/')} variant="outline" className="w-full">
            <Home className="mr-2 h-4 w-4" />
            Return to homepage
          </Button>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Error details (development only)
            </summary>
            <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto text-red-600">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
