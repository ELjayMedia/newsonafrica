"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export function SetupBookmarks() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSetup = async () => {
    try {
      setIsLoading(true)

      const response = await fetch("/api/setup-bookmarks", {
        method: "GET",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to set up bookmarks system")
      }

      toast({
        title: "Success",
        description: data.message || "Bookmarks system set up successfully",
      })
    } catch (error: any) {
      console.error("Error setting up bookmarks:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to set up bookmarks system",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Initialize Bookmarks System</h2>
      <p className="mb-4 text-gray-600">
        Set up the bookmarks database tables and security policies. This only needs to be done once.
      </p>
      <Button onClick={handleSetup} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Setting up...
          </>
        ) : (
          "Initialize Bookmarks System"
        )}
      </Button>
    </div>
  )
}
