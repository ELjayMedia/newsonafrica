import logger from "@/utils/logger";
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Linkedin } from "lucide-react"

interface LinkedInConfig {
  apiKey: string
  // Add other configuration properties as needed
}

export const LinkedInShare: React.FC = () => {
  const [linkedInConfig, setLinkedInConfig] = useState<LinkedInConfig | null>(null)

  useEffect(() => {
    const fetchLinkedInConfig = async () => {
      try {
        const response = await fetch("/api/linkedin/config")
        const config = await response.json()
        setLinkedInConfig(config)
      } catch (error) {
        logger.error("Failed to fetch LinkedIn config:", error)
      }
    }

    fetchLinkedInConfig()
  }, [])

  if (!linkedInConfig) {
    return <div>Loading LinkedIn share options...</div>
  }

  const shareUrl = encodeURIComponent(window.location.href)
  const shareText = encodeURIComponent("Check out this awesome content!")
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}&summary=${shareText}`

  return (
    <Button
      variant="outline"
      size="icon"
      className="rounded-full bg-[#0077B5] hover:bg-[#0077B5]/90 text-white border-none"
      onClick={() => window.open(linkedInUrl, "_blank", "noopener,noreferrer")}
      aria-label="Share on LinkedIn"
    >
      <Linkedin className="h-4 w-4" />
    </Button>
  )
}

export default LinkedInShare
