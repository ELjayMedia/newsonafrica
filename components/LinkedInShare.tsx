"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Linkedin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface LinkedInShareProps {
  title: string
  url: string
  summary?: string
  imageUrl?: string
  className?: string
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  iconOnly?: boolean
}

export function LinkedInShare({
  title,
  url,
  summary,
  imageUrl,
  className = "",
  variant = "outline",
  size = "icon",
  iconOnly = true,
}: LinkedInShareProps) {
  const [isSharing, setIsSharing] = useState(false)
  const { toast } = useToast()

  const handleShare = async () => {
    setIsSharing(true)

    try {
      // First try the Web Share API if available (mobile-friendly)
      if (navigator.share && !navigator.userAgent.includes("Firefox")) {
        await navigator.share({
          title,
          text: summary || title,
          url,
        })
        toast({
          title: "Shared successfully",
          description: "Content was shared successfully",
          variant: "default",
        })
        setIsSharing(false)
        return
      }

      // If Web Share API is not available, try LinkedIn API
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
        // Not authenticated, open LinkedIn auth in a popup
        const width = 600
        const height = 600
        const left = window.innerWidth / 2 - width / 2
        const top = window.innerHeight / 2 - height / 2

        const authWindow = window.open(
          `/api/linkedin/auth?redirect_uri=${encodeURIComponent(window.location.href)}&popup=true`,
          "linkedin-auth",
          `width=${width},height=${height},left=${left},top=${top}`,
        )

        // Poll for auth window closure
        const checkClosed = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(checkClosed)
            setIsSharing(false)
            // Try sharing again after a short delay
            setTimeout(() => {
              toast({
                title: "Authentication complete",
                description: "Please try sharing again",
                variant: "default",
              })
            }, 1000)
          }
        }, 500)

        return
      }

      const data = await shareResponse.json()

      if (data.success) {
        toast({
          title: "Shared to LinkedIn",
          description: "Your content was shared successfully",
          variant: "default",
        })
      } else {
        // Fallback to LinkedIn share dialog
        const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(summary || title)}`
        window.open(linkedInUrl, "_blank", "width=600,height=600")

        toast({
          title: "Sharing via LinkedIn",
          description: "Continuing in a new window",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("LinkedIn sharing error:", error)

      // Fallback to LinkedIn share dialog on error
      const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(summary || title)}`
      window.open(linkedInUrl, "_blank", "width=600,height=600")

      toast({
        title: "Sharing via LinkedIn",
        description: "Continuing in a new window",
        variant: "default",
      })
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <Button
      onClick={handleShare}
      disabled={isSharing}
      variant={variant}
      size={size}
      className={`${className} ${iconOnly ? "p-2 h-auto" : ""}`}
      aria-label="Share on LinkedIn"
    >
      <Linkedin className={`h-4 w-4 ${!iconOnly ? "mr-2" : ""}`} />
      {!iconOnly && (isSharing ? "Sharing..." : "LinkedIn")}
    </Button>
  )
}
