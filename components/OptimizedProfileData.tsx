"use client"

import { createClient } from "@/utils/supabase/client"
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery"
import type { Profile } from "@/services/profile-service"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface ProfileDataProps {
  userId: string
}

export function OptimizedProfileData({ userId }: ProfileDataProps) {
  const supabase = createClient()

  const { data: profile, isLoading, isError, error } = useSupabaseQuery<Profile>(
    () => supabase.from("profiles").select("id, username, full_name, avatar_url").eq("id", userId).single(),
    ["profile", userId],
    { cacheTime: 5 * 60 * 1000, refetchInterval: 5 * 60 * 1000 }
  )

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
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src={profile.avatar_url || "/default-avatar.png"} />
            <AvatarFallback>{profile.username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{profile.full_name || profile.username}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

