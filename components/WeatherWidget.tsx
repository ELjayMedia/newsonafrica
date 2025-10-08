"use client"

import { type FC, useEffect, useMemo, useState } from "react"

const WEATHER_ENDPOINT =
  "https://api.open-meteo.com/v1/forecast?latitude=-26.5&longitude=31.5&hourly=temperature_2m&timezone=auto&forecast_days=1&bounding_box=-90,-180,90,180"

interface WeatherApiResponse {
  hourly?: {
    temperature_2m?: number[]
    time?: string[]
  }
}

interface WeatherState {
  temperature: number | null
  observedAt: string | null
  loading: boolean
}

const WeatherWidget: FC = () => {
  const [{ temperature, observedAt, loading }, setWeatherState] = useState<WeatherState>({
    temperature: null,
    observedAt: null,
    loading: true,
  })

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const fetchWeather = async () => {
      try {
        const response = await fetch(WEATHER_ENDPOINT, {
          signal: controller.signal,
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const data: WeatherApiResponse = await response.json()

        if (!isMounted) {
          return
        }

        const times = data.hourly?.time ?? []
        const temperatures = data.hourly?.temperature_2m ?? []

        let matchedTemperature: number | null = null
        let matchedTime: string | null = null

        if (times.length && temperatures.length && times.length === temperatures.length) {
          const now = new Date()

          const nearestIndex = times.findIndex((time) => new Date(time).getTime() >= now.getTime())

          const index = nearestIndex === -1 ? temperatures.length - 1 : nearestIndex

          matchedTemperature = Number.isFinite(temperatures[index]) ? temperatures[index] : null
          matchedTime = times[index] ?? null
        }

        setWeatherState({
          temperature: matchedTemperature,
          observedAt: matchedTime,
          loading: false,
        })
      } catch (error) {
        if (controller.signal.aborted || !isMounted) {
          return
        }

        console.error("[WeatherWidget] Failed to fetch weather data", error)

        setWeatherState({
          temperature: null,
          observedAt: null,
          loading: false,
        })
      }
    }

    fetchWeather()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [])

  const formattedTime = useMemo(() => {
    if (!observedAt) {
      return null
    }

    const observedDate = new Date(observedAt)

    if (Number.isNaN(observedDate.getTime())) {
      return null
    }

    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(observedDate)
  }, [observedAt])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm" aria-live="polite" aria-busy={true}>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
        <span>Loading weather</span>
      </div>
    )
  }

  if (temperature === null) {
    return null
  }

  return (
    <div className="flex items-center gap-2 text-gray-600 text-sm" aria-live="polite">
      <span className="font-semibold">{Math.round(temperature)}°C</span>
      {formattedTime ? <span className="text-xs text-gray-400">as of {formattedTime}</span> : null}
    </div>
  )
}

export { WeatherWidget }
