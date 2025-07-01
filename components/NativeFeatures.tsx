"use client"

import { useState } from "react"
import { Camera, CameraResultType } from "@capacitor/camera"
import { Geolocation } from "@capacitor/geolocation"
import { LocalNotifications } from "@capacitor/local-notifications"

export function NativeFeatures() {
  const [photo, setPhoto] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)

  const takePhoto = async () => {
    try {
      const image = await Camera.getPhoto({ resultType: CameraResultType.DataUrl })
      setPhoto(image.dataUrl || null)
    } catch (err) {
      console.error("Camera error", err)
    }
  }

  const getLocation = async () => {
    try {
      const position = await Geolocation.getCurrentPosition()
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude })
    } catch (err) {
      console.error("Geolocation error", err)
    }
  }

  const sendNotification = async () => {
    try {
      const perm = await LocalNotifications.requestPermissions()
      if (perm.display !== "granted") return

      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now(),
            title: "Hello from NewsOnAfrica",
            body: "This is a local notification",
          },
        ],
      })
    } catch (err) {
      console.error("Local notification error", err)
    }
  }

  return (
    <section className="bg-gray-50 p-4 rounded-lg space-y-2">
      <h2 className="text-lg font-semibold">Capacitor Native Features</h2>
      <div className="space-y-2">
        <button
          onClick={takePhoto}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Take Photo
        </button>
        {photo && <img src={photo} alt="Captured" className="w-full max-w-xs rounded" />}

        <button
          onClick={getLocation}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Get Location
        </button>
        {coords && (
          <p className="text-sm">
            {coords.latitude}, {coords.longitude}
          </p>
        )}

        <button
          onClick={sendNotification}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Send Local Notification
        </button>
      </div>
    </section>
  )
}
