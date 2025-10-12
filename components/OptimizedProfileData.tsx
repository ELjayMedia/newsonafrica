"use client"

import { useState } from "react"
import { useSupabaseQuery, useSupabaseMutation } from "@/hooks/useSupabaseQuery"
import { getProfileById } from "@/app/actions/profile"
import { updateProfile as updateProfileAction } from "@/app/actions/auth"
import type { Database } from "@/types/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

interface ProfileDataProps {
  userId: string
}

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export function OptimizedProfileData({ userId }: ProfileDataProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [bio, setBio] = useState("")

  // Optimized query for profile data
  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useSupabaseQuery<Profile | null>(
    async () => {
      const result = await getProfileById(userId)

      if (result.error) {
        throw result.error
      }

      return result.data ?? null
    },
    ["profile", userId],
    {
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
      onSuccess: (data) => {
        setBio(data?.bio || "")
      },
      select: (data) => data ?? null,
    },
  )

  // Optimized mutation for updating profile
  const { mutate: updateProfile, isLoading: isUpdating } = useSupabaseMutation<Profile, { bio: string }>(
    async (variables) => {
      const result = await updateProfileAction({ bio: variables.bio })

      if (result.error || !result.data) {
        throw result.error ?? new Error("Failed to update profile")
      }

      return result.data
    },
    {
      onSuccess: () => {
        setIsEditing(false)
        refetch() // Refresh the data
      },
      invalidateQueries: [`profile:${userId}`],
    },
  )

  const handleSave = () => {
    updateProfile({ bio })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-8 w-[200px]" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          </div>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error?.message || "Failed to load profile data"}</p>
          <Button onClick={refetch} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No profile data available for this user.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{profile.username}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4 mb-4">
          <Avatar>
            <AvatarImage src={profile.avatar_url || "/default-avatar.png"} />
            <AvatarFallback>{profile.username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <p>{profile.bio}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        {isEditing ? (
          <div className="flex space-x-2">
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="flex-1 border rounded px-2 py-1"
            />
            <Button onClick={handleSave} disabled={isUpdating}>
              Save
            </Button>
            <Button onClick={() => setIsEditing(false)}>Cancel</Button>
          </div>
        ) : (
          <Button onClick={() => setIsEditing(true)}>Edit Bio</Button>
        )}
      </CardFooter>
    </Card>
  )
}
