"use client"

import dynamic from "next/dynamic"

const ResponsiveReturnButton = dynamic(() => import("./client/ResponsiveReturnButton"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center">
      <a href="/" className="px-6 py-3 bg-black text-white font-medium rounded-md hover:bg-gray-800 transition-colors">
        Return to Homepage
      </a>
    </div>
  ),
})

export default function ClientMediaQueryWrapper() {
  return <ResponsiveReturnButton />
}
