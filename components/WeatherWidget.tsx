"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type WeatherHourlyData = {
  time: string[]
  temperature_2m: number[]
}

type WeatherApiResponse = {
  hourly: WeatherHourlyData
}

type WeatherSnapshot = {
  temperatureC: number
  updatedAt: Date
}

const WEATHER_ENDPOINT =
  "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m&timezone=auto&forecast_days=1"
const REFRESH_INTERVAL = 30 * 60 * 1000

const WeatherWidget = () => {
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const controllerRef = useRef<AbortController | null>(null)
  const hasSnapshotRef = useRef(false)

  const fetchWeather = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    try {
      if (!hasSnapshotRef.current) {
        setIsLoading(true)
      }
      setError(null)

      const response = await fetch(WEATHER_ENDPOINT, {
        signal: controller.signal,
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const data = (await response.json()) as WeatherApiResponse
      const hourlyTimes = data.hourly.time
      const hourlyTemps = data.hourly.temperature_2m

      if (!hourlyTimes?.length || !hourlyTemps?.length) {
        throw new Error("Incomplete weather data")
      }

      const now = Date.now()
      let closestIndex = 0
      let smallestDiff = Number.POSITIVE_INFINITY

      hourlyTimes.forEach((timestamp, index) => {
        const diff = Math.abs(new Date(timestamp).getTime() - now)
        if (diff < smallestDiff) {
          smallestDiff = diff
          closestIndex = index
        }
      })

      const temperature = hourlyTemps[closestIndex]
      const updatedAt = new Date(hourlyTimes[closestIndex])

      if (!Number.isFinite(temperature)) {
        throw new Error("Temperature data unavailable")
      }

      setSnapshot({
        temperatureC: temperature,
        updatedAt,
      })
      hasSnapshotRef.current = true
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return
      }
      setError((err as Error).message || "Unable to load weather")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      if (!mounted) return
      await fetchWeather()
    }

    void load()
    const intervalId = window.setInterval(() => {
      if (!mounted) return
      void fetchWeather()
    }, REFRESH_INTERVAL)

    return () => {
      mounted = false
      controllerRef.current?.abort()
      window.clearInterval(intervalId)
    }
  }, [fetchWeather])

  const temperatureDisplay = snapshot
    ? `${Math.round(snapshot.temperatureC)}°C`
    : "—°C"
  const updatedDisplay = snapshot
    ? new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(snapshot.updatedAt)
    : "--:--"
  const statusMessage = error ?? (isLoading ? "Loading weather" : "Weather")

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span aria-live="polite" aria-busy={isLoading} className="font-medium">
        {temperatureDisplay}
      </span>
      <span aria-hidden="true" role="img">
        🌤️
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-xs uppercase tracking-wide">{statusMessage}</span>
        <span className="text-xs">Updated {updatedDisplay}</span>
      </div>
    </div>
  )
}

export { WeatherWidget }
