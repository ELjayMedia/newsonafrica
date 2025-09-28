"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useUser } from "@/contexts/UserContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Camera, Save, Loader2 } from "lucide-react"
import { uploadUserAvatar } from "@/lib/api/supabase"

export function ElegantProfileEditor() {
  const { user, profile, updateProfile } = useUser()
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    username: profile?.username || "",
    full_name: profile?.full_name || "",
    bio: profile?.bio || "",
    website: profile?.website || "",
    country: profile?.country || "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setIsUploadingAvatar(true)
    try {
      const result = await uploadUserAvatar(file, user.id)
      if (result.success && result.url) {
        toast({
          title: "Avatar Updated",
          description: "Your profile picture has been updated successfully.",
        })
        // The profile will be updated automatically via the UserContext
      } else {
        throw new Error(result.error || "Failed to upload avatar")
      }
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload avatar. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    try {
      await updateProfile(formData)
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const userInitials =
    profile?.username?.slice(0, 2).toUpperCase() ||
    profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
    user?.email?.slice(0, 2).toUpperCase() ||
    "U"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar Section */}
      <div className="flex items-center space-x-6">
        <div className="relative">
          <Avatar className="h-24 w-24 border-4 border-amber-200">
            <AvatarImage src={profile?.avatar_url || ""} alt={profile?.username || "User"} />
            <AvatarFallback className="bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 font-medium text-lg">
              {userInitials}
            </AvatarFallback>
          </Avatar>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-full p-2 shadow-lg transition-all duration-200 disabled:opacity-50"
          >
            {isUploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
        </div>

        <div>
          <h3 className="text-lg font-serif font-medium text-gray-800">Profile Picture</h3>
          <p className="text-sm text-gray-600">
            Click the camera icon to upload a new profile picture.
            <br />
            JPG, PNG or WebP. Max file size 5MB.
          </p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium text-gray-700">
            Username
          </Label>
          <Input
            id="username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            placeholder="Your unique username"
            className="border-gray-200 focus:border-amber-500 focus:ring-amber-500"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="full_name" className="text-sm font-medium text-gray-700">
            Full Name
          </Label>
          <Input
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleInputChange}
            placeholder="Your full name"
            className="border-gray-200 focus:border-amber-500 focus:ring-amber-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country" className="text-sm font-medium text-gray-700">
            Country
          </Label>
          <Input
            id="country"
            name="country"
            value={formData.country}
            onChange={handleInputChange}
            placeholder="Your country"
            className="border-gray-200 focus:border-amber-500 focus:ring-amber-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website" className="text-sm font-medium text-gray-700">
            Website
          </Label>
          <Input
            id="website"
            name="website"
            type="url"
            value={formData.website}
            onChange={handleInputChange}
            placeholder="https://yourwebsite.com"
            className="border-gray-200 focus:border-amber-500 focus:ring-amber-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio" className="text-sm font-medium text-gray-700">
          Bio
        </Label>
        <Textarea
          id="bio"
          name="bio"
          value={formData.bio}
          onChange={handleInputChange}
          placeholder="Tell us about yourself..."
          rows={4}
          className="border-gray-200 focus:border-amber-500 focus:ring-amber-500 resize-none"
        />
        <p className="text-xs text-gray-500">{formData.bio.length}/500 characters</p>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-medium px-8"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
