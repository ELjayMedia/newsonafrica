"use client"

import { useEffect } from "react"
import { useUser } from "@/contexts/UserContext"
import { Button } from "@/components/ui/button"
import { Facebook } from "lucide-react"

declare global {
  interface Window {
    FB: any
  }
}

export function FacebookLogin() {
  const { login } = useUser()

  useEffect(() => {
    if (typeof window !== "undefined" && window.FB) {
      window.FB.XFBML.parse()
    }
  }, [])

  const handleFacebookLogin = () => {
    if (typeof window !== "undefined" && window.FB) {
      window.FB.login(
        async (response: any) => {
          if (response.authResponse) {
            const { accessToken, userID } = response.authResponse
            try {
              await login("facebook", { accessToken, userID })
            } catch (error) {
              console.error("Error during Facebook login:", error)
            }
          } else {
            console.log("User cancelled login or did not fully authorize.")
          }
        },
        { scope: "email,public_profile" },
      )
    }
  }

  return (
    <Button onClick={handleFacebookLogin} variant="outline" className="w-full">
      <Facebook className="mr-2 h-4 w-4" />
      Continue with Facebook
    </Button>
  )
}
