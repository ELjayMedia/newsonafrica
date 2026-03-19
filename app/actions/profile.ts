"use server"

import { randomUUID } from "node:crypto"

import { withSupabaseSession } from "@/app/actions/supabase"
import { CACHE_TAGS } from "@/lib/cache/constants"
import { revalidateByTag } from "@/lib/server-cache-utils"
import { ActionError, type ActionResult } from "@/lib/supabase/action-result"
import { mapProfileRowToAuthProfile } from "@/lib/supabase/adapters/profiles"
import type { Database } from "@/types/supabase"

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type ProfileDetailsRow = Pick<
  Profile,
  "id" | "username" | "handle" | "full_name" | "avatar_url" | "website" | "email" | "bio" | "country" | "location" | "interests" | "preferences" | "updated_at" | "created_at" | "is_admin" | "onboarded" | "role"
>

const PROFILE_DETAILS_SELECT_COLUMNS =
  "id, username, handle, full_name, avatar_url, website, email, bio, country, location, interests, preferences, updated_at, created_at, is_admin, onboarded, role"

function toSerializable<T>(value: T): T {
  if (value === null || value === undefined) {
    return value
  }

  return JSON.parse(JSON.stringify(value)) as T
}

export async function getProfileById(userId: string): Promise<ActionResult<ProfileDetailsRow | null>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    if (!session?.user) {
      throw new ActionError("User not authenticated", { status: 401 })
    }

    if (session.user.id !== userId) {
      throw new ActionError("You do not have access to this profile", { status: 403 })
    }

    const { data, error } = await supabase.from("profiles").select(PROFILE_DETAILS_SELECT_COLUMNS).eq("id", userId).maybeSingle<ProfileDetailsRow>()

    if (error) {
      throw new ActionError("Failed to load profile", { cause: error })
    }

    return mapProfileRowToAuthProfile(data)
  })
}

export async function uploadProfileAvatar(formData: FormData): Promise<ActionResult<{ avatarUrl: string }>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    if (!session?.user) {
      throw new ActionError("User not authenticated", { status: 401 })
    }

    const file = formData.get("file")

    if (!(file instanceof File)) {
      throw new ActionError("Invalid file upload")
    }

    const extension = file.name.split(".").pop() || "png"
    const fileName = `${session.user.id}-${randomUUID()}.${extension}`
    const filePath = `avatars/${fileName}`

    const { error: uploadError } = await supabase.storage.from("profiles").upload(filePath, file, {
      upsert: true,
      contentType: file.type || undefined,
      cacheControl: "3600",
    })

    if (uploadError) {
      throw new ActionError("Failed to upload avatar", { cause: uploadError })
    }

    const { data } = supabase.storage.from("profiles").getPublicUrl(filePath)
    const avatarUrl = data.publicUrl

    revalidateByTag(CACHE_TAGS.USERS)

    return { avatarUrl }
  })
}
