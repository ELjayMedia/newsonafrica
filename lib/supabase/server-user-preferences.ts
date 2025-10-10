import { createClient } from "@/utils/supabase/server"
import type { Database } from "@/types/supabase"

export interface ServerUserPreferences {
  sections: string[]
}

const EMPTY_PREFERENCES: ServerUserPreferences = {
  sections: [],
}

export async function getServerUserPreferences(): Promise<ServerUserPreferences> {
  try {
    const supabase = createClient()

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("Failed to load Supabase session", sessionError)
      return EMPTY_PREFERENCES
    }

    const user = session?.user
    if (!user) {
      return EMPTY_PREFERENCES
    }

    const { data, error } = await supabase
      .from("user_preferences")
      .select("sections")
      .eq("user_id", user.id)
      .maybeSingle<Pick<Database["public"]["Tables"]["user_preferences"]["Row"], "sections">>()

    if (error) {
      if (error.code !== "PGRST116") {
        console.error("Failed to load user preferences", error)
      }
      return EMPTY_PREFERENCES
    }

    return {
      sections: Array.isArray(data?.sections)
        ? data!.sections.filter((section): section is string => typeof section === "string")
        : [],
    }
  } catch (error) {
    console.error("Failed to resolve server user preferences", error)
    return EMPTY_PREFERENCES
  }
}

export async function getServerUserPreferredSections(): Promise<string[]> {
  const preferences = await getServerUserPreferences()
  return preferences.sections
}
