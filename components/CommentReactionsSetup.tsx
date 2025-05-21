"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

export function CommentReactionsSetup() {
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const { toast } = useToast()

  const setupReactions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/db/apply-comment-reactions-rls")
      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Comment reactions setup completed successfully",
        })
        setIsComplete(true)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to set up comment reactions",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error setting up comment reactions:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isComplete) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <AlertTitle>Setup Complete</AlertTitle>
        <AlertDescription>
          Comment reactions have been set up successfully. Users can now react to comments.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertTitle>Comment Reactions Setup Required</AlertTitle>
        <AlertDescription>
          The comment reactions feature requires additional database setup. Click the button below to set up the
          necessary tables and policies.
        </AlertDescription>
      </Alert>
      <Button onClick={setupReactions} disabled={isLoading}>
        {isLoading ? "Setting up..." : "Set Up Comment Reactions"}
      </Button>
    </div>
  )
}
