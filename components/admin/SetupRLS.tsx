"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export default function SetupRLS() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSetupRLS = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/setup-rls")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to set up RLS policies")
      }

      toast({
        title: "Success",
        description: "RLS policies set up successfully",
      })
    } catch (error: any) {
      console.error("Error setting up RLS:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to set up RLS policies",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-amber-50 mb-6">
      <h3 className="text-lg font-medium mb-2">Database Security Setup</h3>
      <p className="text-sm mb-4">
        If you're experiencing permission errors with bookmarks, you may need to set up Row Level Security policies.
      </p>
      <Button onClick={handleSetupRLS} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up...
          </>
        ) : (
          "Set up RLS Policies"
        )}
      </Button>
    </div>
  )
}
