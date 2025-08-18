import logger from "@/utils/logger";
"use client"

import { useState } from "react"
import { Facebook, Linkedin, Mail, LinkIcon, PhoneIcon as WhatsApp, Share2, X, Check } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useMediaQuery } from "@/hooks/useMediaQuery"

interface ShareButtonsProps {
  title: string
  url: string
  description?: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  showLabel?: boolean
}

export function ShareButtons({
  title,
  url,
  description = "",
  variant = "outline",
  size = "sm",
  className = "",
  showLabel = true,
}: ShareButtonsProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Ensure we have the full URL
  const fullUrl = url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}${url}`

  // Encode components for sharing
  const encodedUrl = encodeURIComponent(fullUrl)
  const encodedTitle = encodeURIComponent(title)
  const encodedDescription = encodeURIComponent(description || title)

  // Share URLs for different platforms
  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
  }

  // Handle native sharing if available
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: fullUrl,
        })

        toast({
          title: "Shared successfully",
          description: "The article has been shared",
        })
      } catch (error) {
        logger.error("Error sharing:", error)
      }
    } else {
      setIsOpen(true)
    }
  }

  // Handle copy to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullUrl)
    setCopied(true)

    toast({
      title: "Link copied",
      description: "Article link copied to clipboard",
    })

    setTimeout(() => setCopied(false), 2000)
  }

  // Handle platform-specific sharing
  const handleShare = (platform: keyof typeof shareUrls) => {
    window.open(shareUrls[platform], "_blank", "noopener,noreferrer")
    setIsOpen(false)
  }

  // If native sharing is available on mobile, use that
  if (isMobile && navigator.share) {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={handleNativeShare}
        className={`${className} bg-blue-600 hover:bg-blue-700 text-white border-none transition-all duration-200`}
        aria-label="Share article"
      >
        <Share2 className="h-4 w-4 mr-2" />
        {showLabel && "Share"}
      </Button>
    )
  }

  // Otherwise use the popover
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant={variant} size={size} className={className} aria-label="Share article">
          <Share2 className="h-4 w-4 mr-2" />
          {showLabel && "Share"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-4">
          <div className="text-sm font-medium">Share this article</div>

          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white border-none transition-all duration-200"
              onClick={() => handleShare("facebook")}
              aria-label="Share on Facebook"
            >
              <Facebook className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-black hover:bg-black/90 text-white border-none transition-all duration-200"
              onClick={() => handleShare("twitter")}
              aria-label="Share on Twitter/X"
            >
              <X className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-[#0077B5] hover:bg-[#0077B5]/90 text-white border-none transition-all duration-200"
              onClick={() => handleShare("linkedin")}
              aria-label="Share on LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-[#25D366] hover:bg-[#25D366]/90 text-white border-none transition-all duration-200"
              onClick={() => handleShare("whatsapp")}
              aria-label="Share on WhatsApp"
            >
              <WhatsApp className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 border-none transition-all duration-200"
              onClick={() => handleShare("email")}
              aria-label="Share via Email"
            >
              <Mail className="h-4 w-4" />
            </Button>

            <div className="relative flex-1">
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal truncate pr-10"
                onClick={handleCopyLink}
              >
                <span className="truncate">{fullUrl}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full rounded-l-none"
                onClick={handleCopyLink}
                aria-label={copied ? "Copied" : "Copy link"}
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <LinkIcon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
