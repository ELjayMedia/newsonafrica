"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Linkedin } from "lucide-react"
import { shareOnLinkedIn } from "@/app/api/linkedin/server-actions"

interface LinkedInShareProps {
  title: string
  url: string
  summary?: string
}

export function LinkedInShare({ title, url, summary }: LinkedInShareProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [shareResult, setShareResult] = useState<{ success: boolean; message?: string } | null>(null)

  // Get the access token from localStorage or your auth context
  const getAccessToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("linkedin_access_token")
    }
    return null
  }

  const handleShare = async () => {
    setIsSharing(true)
    setShareResult(null)

    try {
      const accessToken = getAccessToken()

      if (!accessToken) {
        // Redirect to LinkedIn auth if no token
        const authUrl = `/api/linkedin/auth?returnTo=${encodeURIComponent(window.location.pathname)}`
        window.location.href = authUrl
        return
      }

      // Create share content
      const content = summary ? `${title}\n\n${summary}` : title

      // Use the server action to share
      const result = await shareOnLinkedIn(accessToken, content, url)

      if (result.success) {
        setShareResult({ success: true, message: "Successfully shared to LinkedIn!" })
      } else {
        setShareResult({ success: false, message: result.error || "Failed to share to LinkedIn" })

        // If token expired, clear it and redirect to auth
        if (result.error?.includes("token") || result.error?.includes("auth")) {
          localStorage.removeItem("linkedin_access_token")
          setTimeout(() => {
            const authUrl = `/api/linkedin/auth?returnTo=${encodeURIComponent(window.location.pathname)}`
            window.location.href = authUrl
          }, 2000)
        }
      }
    } catch (error) {
      console.error("LinkedIn share error:", error)
      setShareResult({ success: false, message: (error as Error).message })
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className="inline-block">
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        disabled={isSharing}
        className="flex items-center gap-2"
      >
        <Linkedin className="h-4 w-4" />
        <span>{isSharing ? "Sharing..." : "LinkedIn"}</span>
      </Button>

      {shareResult && (
        <p className={`text-sm mt-2 ${shareResult.success ? "text-green-600" : "text-red-600"}`}>
          {shareResult.message}
        </p>
      )}
    </div>
  )
}
