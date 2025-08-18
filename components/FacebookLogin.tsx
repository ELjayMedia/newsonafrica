import logger from "@/utils/logger";
"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface FacebookLoginProps {
  onSuccess?: () => void
  onError?: (error: string) => void
  disabled?: boolean
  className?: string
}

export function FacebookLogin({ onSuccess, onError, disabled = false, className = "" }: FacebookLoginProps) {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleFacebookLogin = async () => {
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })

      if (error) {
        throw error
      }

      // Success will be handled by the callback
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      logger.error("Facebook login error:", error)
      const errorMessage = error.message || "Failed to sign in with Facebook"

      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      })

      if (onError) {
        onError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={`w-full flex items-center justify-center gap-2 ${className}`}
      onClick={handleFacebookLogin}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
          <path d="M9.19795 21.5H13.198V13.4901H16.8021L17.198 9.50977H13.198V7.5C13.198 6.94772 13.6457 6.5 14.198 6.5H17.198V2.5H14.198C11.4365 2.5 9.19795 4.73858 9.19795 7.5V9.50977H7.19795L6.80206 13.4901H9.19795V21.5Z" />
        </svg>
      )}
      <span className="sr-only md:not-sr-only md:text-xs">{isLoading ? "Connecting..." : "Facebook"}</span>
    </Button>
  )
}

// Export as named export
