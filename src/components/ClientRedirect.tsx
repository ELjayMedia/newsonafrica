'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ClientRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Go back to the previous page
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback to homepage if there's no history
      router.push('/');
    }
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
      <p className="text-gray-600">Redirecting you back...</p>
    </div>
  );
}

// Add default export that points to the named export
export default ClientRedirect;
