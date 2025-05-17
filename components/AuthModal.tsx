"use client"
import { useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AuthForm } from "@/components/AuthForm"
import { useAuth } from "@/hooks/useAuth"
import { usePathname } from "next/navigation"
import { useUser } from "@/contexts/UserContext"
import { createClient } from "@/utils/supabase-client" // Import createClient
import { useRouter } from "next/router" // Import useRouter

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: "signin" | "signup"
  returnTo?: string
}

export function AuthModal({ open, onOpenChange, defaultTab = "signin", returnTo }: AuthModalProps) {
  const { isAuthenticated } = useAuth()
  const pathname = usePathname()
  const supabase = createClient() // Use imported createClient
  const router = useRouter() // Use imported useRouter
  const { refreshSession } = useUser()

  // Use current path as returnTo if not provided
  const returnPath = returnTo || pathname || "/"

  // Close modal if user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && open) {
      onOpenChange(false)
    }
  }, [isAuthenticated, open, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{defaultTab === "signin" ? "Sign In" : "Create Account"}</DialogTitle>
        </DialogHeader>
        <AuthForm defaultTab={defaultTab} returnTo={returnPath} inModal onComplete={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
