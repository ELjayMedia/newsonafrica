"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useUser } from "@/contexts/UserContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Upload } from "lucide-react"
import { createClient } from "@/utils/supabase/client"

export function ProfileEditor() {
  const { user, profile, updateProfile } = useUser()
  const { toast } = useToast()
  const supabase = createClient()

  const [formState, setFormState] = useState({
    username: "",
    full_name: "",
  })
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (profile) {
      setFormState({
        username: profile.username || "",
        full_name: profile.full_name || "",
      })
      setAvatarUrl(profile.avatar_url)
    }
  }, [profile])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value }))
    setHasChanges(true)

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) {
      return
    }

    const file = e.target.files[0]
    const fileExt = file.name.split(".").pop()
    const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `avatars/${fileName}`

    setUploading(true)

    try {
      const { error: uploadError } = await supabase.storage.from("profiles").upload(filePath, file)
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from("profiles").getPublicUrl(filePath)
      setAvatarUrl(data.publicUrl)
      setHasChanges(true)

      toast({
        title: "Avatar uploaded",
        description: "Your profile picture has been updated.",
      })
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload avatar",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formState.username.trim()) {
      newErrors.username = "Username is required"
    } else if (formState.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!hasChanges) return
    if (!validateForm()) return

    try {
      setIsUpdating(true)

      await updateProfile({
        username: formState.username,
        full_name: formState.full_name,
        avatar_url: avatarUrl,
      })

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      })

      setHasChanges(false)
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative">
          <Avatar className="h-24 w-24">
            <AvatarImage src={avatarUrl || undefined} alt={profile?.username || "User"} />
            <AvatarFallback className="text-lg">
              {profile?.full_name
                ? getInitials(profile.full_name)
                : profile?.username
                ? getInitials(profile.username)
                : user?.email
                ? user.email.charAt(0).toUpperCase()
                : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-2 -right-2">
            <Label htmlFor="avatar-upload" className="cursor-pointer">
              <div className="bg-primary text-white p-1.5 rounded-full hover:bg-primary/90 transition-colors">
                <Upload className="h-4 w-4" />
              </div>
              <span className="sr-only">Upload avatar</span>
            </Label>
            <Input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={uploading}
            />
          </div>
        </div>
        <div className="text-center sm:text-left">
          <h3 className="text-lg font-semibold">{profile?.full_name || profile?.username || "User"}</h3>
          <p className="text-sm text-gray-500">{user?.email}</p>
          {uploading && (
            <div className="flex items-center mt-2 text-sm text-gray-500">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Uploading...
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium">
            Username <span className="text-red-500">*</span>
          </Label>
          <Input
            id="username"
            name="username"
            value={formState.username}
            onChange={handleChange}
            className={errors.username ? "border-red-500" : ""}
            required
          />
          {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
          <p className="text-xs text-gray-500">This will be your public display name</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="full_name" className="text-sm font-medium">
            Full Name
          </Label>
          <Input id="full_name" name="full_name" value={formState.full_name} onChange={handleChange} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isUpdating || !hasChanges || Object.keys(errors).length > 0}>
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update Profile"
          )}
        </Button>
      </div>
    </form>
  )
}

