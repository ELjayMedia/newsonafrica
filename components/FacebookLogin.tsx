"use client"

import { useEffect } from "react"
import { useUser } from "@/contexts/UserContext"
import { Button } from "@/components/ui/button"
import { Facebook } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

declare global {
  interface Window {
    FB: any
  }
}

export function FacebookLogin() {
  const { signInWithFacebook } = useUser()
  const supabase = createClient()

  useEffect(() => {
    if (typeof window !== "undefined" && window.FB) {
      window.FB.XFBML.parse()
    }
  }, [])

  const handleFacebookLogin = async () => {
    try {
      await signInWithFacebook()
    } catch (error) {
      console.error("Error during Facebook login:", error)
    }
  }

  return (
    <Button onClick={handleFacebookLogin} variant="outline" className="w-full">
      <Facebook className="mr-2 h-4 w-4" />
      Continue with Facebook
    </Button>
  )
}
