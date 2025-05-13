"use client"

import { useUser } from "@/contexts/UserContext"
import { Button } from "@/components/ui/button"
import { Facebook } from "lucide-react"

export function FacebookLogin() {
  const { signInWithFacebook, loading } = useUser()

  const handleFacebookLogin = async () => {
    try {
      await signInWithFacebook()
    } catch (error) {
      console.error("Error during Facebook login:", error)
    }
  }

  return (
    <Button onClick={handleFacebookLogin} variant="outline" className="w-full" disabled={loading}>
      <Facebook className="mr-2 h-4 w-4" />
      Continue with Facebook
    </Button>
  )
}
