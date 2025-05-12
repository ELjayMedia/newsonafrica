"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

// Dynamically import the content component
const LostPasswordContent = dynamic(() => import("@/components/LostPasswordContent"), {
  loading: () => <div className="p-6 text-center">Loading form...</div>,
  ssr: false,
})

export default function LostPasswordClientWrapper() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Only render the component on the client
  if (!mounted) {
    return <div className="p-6 text-center">Loading...</div>
  }

  return <LostPasswordContent />
}
