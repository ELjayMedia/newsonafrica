"use client"

import { useState } from "react"
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"

export function CameraFeature() {
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const takePicture = async () => {
    setError(null)
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      })

      if (image.webPath) {
        setImageSrc(image.webPath)
      }
    } catch (e: any) {
      console.error("Camera error:", e)
      setError(`Failed to take picture: ${e.message || "Unknown error"}`)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Camera Feature</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Button onClick={takePicture}>Take Photo</Button>
        {imageSrc && (
          <div className="relative w-48 h-48 rounded-md overflow-hidden">
            <Image
              src={imageSrc || "/placeholder.svg"}
              alt="Captured"
              fill
              className="object-cover"
              sizes="192px"
            />
          </div>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <p className="text-xs text-gray-500">Note: This feature requires native device camera access.</p>
      </CardContent>
    </Card>
  )
}
