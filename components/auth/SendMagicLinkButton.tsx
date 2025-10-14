"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createBrowserSupabase } from "@/lib/supabaseClient"

type RequestState = "idle" | "loading" | "success"

const SendMagicLinkButton = (): JSX.Element => {
  const [email, setEmail] = useState("")
  const [state, setState] = useState<RequestState>("idle")
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => {
    try {
      return createBrowserSupabase()
    } catch (clientError) {
      console.warn("[SendMagicLinkButton] Unable to create Supabase client", clientError)
      return null
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      return
    }

    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      const sessionEmail = data.session?.user?.email
      if (sessionEmail && isMounted) {
        setEmail(sessionEmail)
      }
    })

    return () => {
      isMounted = false
    }
  }, [supabase])

  const handleSend = useCallback(async () => {
    if (!email.trim()) {
      setError("Please provide an email address.")
      return
    }

    setState("loading")
    setError(null)

    try {
      const response = await fetch("/api/sendMagicLink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? "Unable to send magic link.")
      }

      setState("success")
    } catch (fetchError) {
      setState("idle")
      setError(fetchError instanceof Error ? fetchError.message : "Something went wrong.")
    }
  }, [email])

  const isLoading = state === "loading"

  return (
    <div className="space-y-3" aria-live="polite">
      <div className="flex flex-col gap-1">
        <label htmlFor="magic-link-email" className="text-sm font-medium">
          Email address
        </label>
        <input
          id="magic-link-email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            if (state === "success") {
              setState("idle")
            }
            if (error) {
              setError(null)
            }
          }}
          disabled={isLoading}
          required
          className="w-full rounded border px-3 py-2 text-sm"
        />
      </div>
      <button
        type="button"
        onClick={handleSend}
        disabled={isLoading || !email.trim()}
        className="inline-flex items-center justify-center rounded bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isLoading ? "Sending…" : "Send magic link"}
      </button>
      {state === "success" && <p className="text-sm text-emerald-600">Check your email for the sign-in link.</p>}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

export default SendMagicLinkButton
