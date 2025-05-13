"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"

// Dynamically import the component with ssr: false (this is valid in a Client Component)
const LostPasswordContent = dynamic(() => import("@/components/LostPasswordContent"), {
  ssr: false,
  loading: () => <div className="p-6 text-center animate-pulse">Loading form...</div>,
})

export default function LostPasswordWrapper() {
  // Optional: Add state to handle hydration issues
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="p-6 text-center">Loading...</div>
  }

  return <LostPasswordContent />
}
