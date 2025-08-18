import logger from "@/utils/logger";
"use client"

import { useState, useEffect } from "react"
import { Geolocation, type Position } from "@capacitor/geolocation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export function GeolocationFeature() {
  const [position, setPosition] = useState<Position | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getCurrentPosition = async () => {
    setLoading(true)
    setError(null)
    try {
      const coordinates = await Geolocation.getCurrentPosition()
      setPosition(coordinates)
    } catch (e: any) {
      logger.error("Geolocation error:", e)
      setError(`Failed to get location: ${e.message || "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Watch for position changes (optional, for continuous updates)
    const watchId = Geolocation.watchPosition({}, (newPosition, err) => {
      if (err) {
        logger.error("Geolocation watch error:", err)
        setError(`Location watch error: ${err.message || "Unknown error"}`)
        return
      }
      if (newPosition) {
        setPosition(newPosition)
      }
    })

    return () => {
      Geolocation.clearWatch({ id: watchId })
    }
  }, [])

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Geolocation Feature</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Button onClick={getCurrentPosition} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? "Getting Location..." : "Get Current Location"}
        </Button>
        {position && (
          <div className="text-center">
            <p>Latitude: {position.coords.latitude.toFixed(4)}</p>
            <p>Longitude: {position.coords.longitude.toFixed(4)}</p>
            <p className="text-xs text-gray-500">Accuracy: {position.coords.accuracy}m</p>
            <p className="text-xs text-gray-500">Timestamp: {new Date(position.timestamp).toLocaleTimeString()}</p>
          </div>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <p className="text-xs text-gray-500">Note: This feature requires native device location access.</p>
      </CardContent>
    </Card>
  )
}
