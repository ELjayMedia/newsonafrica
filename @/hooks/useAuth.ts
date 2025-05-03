"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { fetchUserProfile, updateUserProfile } from "@/lib/wordpress-api"

interface AuthCredentials {
  username?: string
  email?: string
  password?: string
  accessToken?: string
  userID?: string
}

export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem("authToken")
    if (token) {
      try {
        const userData = await fetchUserProfile(token)
        setUser(userData)
        setIsAuthenticated(true)
      } catch (error) {
        console.error("Error fetching user profile:", error)
        logout()
      }
    }
    setIsLoading(false)
  }

  const login = async (provider: string, credentials: AuthCredentials) => {
    setIsLoading(true)
    try {
      let response
      if (provider === "facebook") {
        response = await fetch("/api/auth/facebook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        })
      } else {
        response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        })
      }

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem("authToken", data.token)
        const userData = await fetchUserProfile(data.token)
        setUser(userData)
        setIsAuthenticated(true)
        router.push("/profile")
      } else {
        throw new Error("Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem("authToken")
    setUser(null)
    setIsAuthenticated(false)
    router.push("/")
  }

  const updateProfile = async (userData: any) => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("authToken")
      if (!token) throw new Error("No auth token found")
      const updatedUser = await updateUserProfile(token, userData)
      setUser(updatedUser)
      return updatedUser
    } catch (error) {
      console.error("Error updating profile:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const getFacebookCredentials = () => {
    if (user && user.facebookId) {
      return {
        id: user.facebookId,
        username: user.name,
        email: user.email,
      }
    }
    return null
  }

  return { user, isLoading, isAuthenticated, login, logout, updateProfile, getFacebookCredentials }
}
