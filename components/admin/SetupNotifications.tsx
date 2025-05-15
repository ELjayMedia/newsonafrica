"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export function SetupNotifications() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const setupNotifications = async () => {
    setIsLoading(true)
    try {
      // Fetch the SQL script
      const response = await fetch("/api/setup-notifications")

      if (!response.ok) {
        throw new Error("Failed to fetch setup script")
      }

      const result = await response.json()

      if (result.success) {
        setIsComplete(true)
        toast({
          title: "Setup complete",
          description: "Notification system has been set up successfully",
        })
      } else {
        throw new Error(result.error || "Unknown error")
      }
    } catch (error) {
      console.error("Error setting up notifications:", error)
      toast({
        title: "Setup failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Up Notification System</CardTitle>
        <CardDescription>
          This will create the necessary database tables and policies for the notification system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">This setup will create:</p>
        <ul className="list-disc list-inside text-sm mt-2 space-y-1">
          <li>Notifications table</li>
          <li>Comment reactions table</li>
          <li>Required indexes and RLS policies</li>
          <li>Additional columns for the comments table</li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button onClick={setupNotifications} disabled={isLoading || isComplete}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up...
            </>
          ) : isComplete ? (
            "Setup Complete"
          ) : (
            "Run Setup"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
