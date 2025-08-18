import logger from "@/utils/logger";
import { supabase } from "./supabase"

export class AuthStateManager {
  private static instance: AuthStateManager
  private authListeners: ((user: any) => void)[] = []

  static getInstance(): AuthStateManager {
    if (!AuthStateManager.instance) {
      AuthStateManager.instance = new AuthStateManager()
    }
    return AuthStateManager.instance
  }

  constructor() {
    this.initializeAuthListener()
  }

  private initializeAuthListener() {
    supabase.auth.onAuthStateChange(async (event, session) => {
      logger.info("Auth state changed:", event, session?.user?.email)

      if (event === "SIGNED_IN" && session?.user) {
        // Ensure user profile exists
        await this.ensureUserProfile(session.user)

        // Notify listeners
        this.authListeners.forEach((listener) => listener(session.user))
      } else if (event === "SIGNED_OUT") {
        // Notify listeners
        this.authListeners.forEach((listener) => listener(null))
      }
    })
  }

  private async ensureUserProfile(user: any) {
    try {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (!profile) {
        const email = user.email
        const name = user.user_metadata?.full_name || user.user_metadata?.name || email?.split("@")[0] || "User"

        let username = email ? email.split("@")[0] : name.toLowerCase().replace(/\s+/g, "")

        // Check if username exists
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", username)
          .single()

        if (existingUser) {
          username = `${username}_${Math.floor(Math.random() * 10000)}`
        }

        await supabase.from("profiles").insert({
          id: user.id,
          username,
          email: user.email,
          full_name: name,
          avatar_url: user.user_metadata?.avatar_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    } catch (error) {
      logger.error("Error ensuring user profile:", error)
    }
  }

  addAuthListener(listener: (user: any) => void) {
    this.authListeners.push(listener)
  }

  removeAuthListener(listener: (user: any) => void) {
    this.authListeners = this.authListeners.filter((l) => l !== listener)
  }

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      logger.error("Sign out error:", error)
      throw error
    }
  }

  async getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  }

  async getCurrentSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session
  }
}

// Export singleton instance
export const authStateManager = AuthStateManager.getInstance()
