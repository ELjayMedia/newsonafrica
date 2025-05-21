"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Facebook, Twitter, Mail, LinkIcon, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LinkedInShare } from "./LinkedInShare"
import { useToast } from "@/hooks/use-toast"

interface SocialShareProps {
  url: string
  title: string
  description: string
  className?: string
}

export function SocialShare({ url, title, description, className = "" }: SocialShareProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}&via=newsonafrica_&related=newsonafrica_`,
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copied",
        description: "Link copied to clipboard",
        variant: "default",
      })
    })
  }

  const shareByEmail = () => {
    window.location.href = `mailto:?subject=${encodedTitle}&body=${encodedUrl}`
  }

  const toggleShareOptions = () => setShowOptions(!showOptions)

  const handleTwitterShare = () => {
    if (typeof window !== "undefined" && (window as any).fbq) {
      ;(window as any).fbq("track", "Share", { platform: "twitter" })
    }
    window.open(shareLinks.twitter, "_blank", "width=550,height=420")
  }

  const ShareButton: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string }> = ({
    onClick,
    icon,
    label,
  }) => (
    <Button
      variant="outline"
      onClick={onClick}
      className="rounded-full h-10 w-10 p-0 flex items-center justify-center"
      aria-label={label}
    >
      {icon}
    </Button>
  )

  const ShareOptions = () => (
    <>
      <ShareButton
        onClick={() => window.open(shareLinks.facebook, "_blank")}
        icon={<Facebook className="h-5 w-5" />}
        label="Share on Facebook"
      />
      <ShareButton onClick={handleTwitterShare} icon={<Twitter className="h-5 w-5" />} label="Share on X (Twitter)" />
      <LinkedInShare url={url} title={title} summary={description} iconOnly />
      <ShareButton onClick={shareByEmail} icon={<Mail className="h-5 w-5" />} label="Share by Email" />
      <ShareButton onClick={handleCopyLink} icon={<LinkIcon className="h-5 w-5" />} label="Copy link" />
    </>
  )

  // Try to use native share API on mobile if available
  const handleNativeShare = async () => {
    if (navigator.share && !navigator.userAgent.includes("Firefox")) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        })
      } catch (err) {
        // If native share fails or is cancelled, show our custom share options
        setShowOptions(true)
      }
    } else {
      // If native share is not available, show our custom share options
      setShowOptions(true)
    }
  }

  return (
    <div className={`relative ${className}`}>
      {isMobile ? (
        <>
          <Button
            variant="outline"
            onClick={handleNativeShare}
            className="rounded-full h-10 w-10 p-0 flex items-center justify-center"
            aria-label="Share"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          {showOptions && (
            <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 shadow-md rounded-md p-2 flex flex-col gap-2 z-50">
              <ShareOptions />
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2">
          <ShareOptions />
        </div>
      )}
    </div>
  )
}
