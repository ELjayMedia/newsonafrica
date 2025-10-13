"use server"

import { randomUUID } from "crypto"

import { withSupabaseSession } from "@/app/actions/supabase"
import { ActionError, type ActionResult } from "@/lib/supabase/action-result"
import type { Database } from "@/types/supabase"

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]

const toSerializable = <T>(value: T): T => {
  if (value === null || value === undefined) {
    return value
  }

  return JSON.parse(JSON.stringify(value)) as T
}

export async function getProfileById(userId: string): Promise<ActionResult<Profile | null>> {
  return withSupabaseSession(async ({ supabase, session }) => {
    if (!session?.user) {
      throw new ActionError("User not authenticated", { status: 401 })
    }

    if (session.user.id !== userId) {
      throw new ActionError("You do not have access to this profile", { status: 403 })
    }

    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()

    if (error) {
      throw new ActionError("Failed to load profile", { cause: error })
    }

    return toSerializable(data ?? null)
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

    return toSerializable({ avatarUrl })
  })
}
