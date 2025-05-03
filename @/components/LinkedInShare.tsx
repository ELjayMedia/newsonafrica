"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Linkedin } from "lucide-react"

interface LinkedInShareProps {
  title: string
  url: string
  summary?: string
  imageUrl?: string
}

export function LinkedInShare({ title, url, summary, imageUrl }: LinkedInShareProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [shareResult, setShareResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleShare = async () => {
    setIsSharing(true)
    setShareResult(null)

    try {
      // First check if we have a LinkedIn token in cookies
      const shareResponse = await fetch("/api/linkedin/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          url,
          summary: summary || title,
          imageUrl,
        }),
      })

      if (shareResponse.status === 401) {
        // Not authenticated, redirect to auth endpoint
        window.location.href = `/api/linkedin/auth?redirect_uri=${encodeURIComponent(window.location.href)}`
        return
      }

      const data = await shareResponse.json()

      if (data.success) {
        setShareResult({
          success: true,
          message: "Successfully shared to LinkedIn!",
        })
      } else {
        setShareResult({
          success: false,
          message: data.error || "Failed to share to LinkedIn",
        })
      }
    } catch (error) {
      setShareResult({
        success: false,
        message: "An error occurred while sharing to LinkedIn",
      })
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className="linkedin-share">
      <Button
        onClick={handleShare}
        disabled={isSharing}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <Linkedin className="h-4 w-4" />
        {isSharing ? "Sharing..." : "Share on LinkedIn"}
      </Button>

      {shareResult && (
        <p className={`mt-2 text-sm ${shareResult.success ? "text-green-600" : "text-red-600"}`}>
          {shareResult.message}
        </p>
      )}
    </div>
  )
}
