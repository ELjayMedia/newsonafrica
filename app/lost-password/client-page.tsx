"use client"

import { LostPasswordContent } from "@/components/LostPasswordContent"
import { useEffect, useState } from "react"

export default function ClientLostPasswordPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="p-6 text-center">Loading...</div>
  }

  return <LostPasswordContent />
}
