"use client"

import type React from "react"

import { useState, useEffect, useTransition } from "react"
import { useUser } from "@/contexts/UserContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Upload } from "lucide-react"
import { uploadProfileAvatar } from "@/app/actions/profile"
import { ActionError } from "@/lib/supabase/action-result"

// List of African countries
const AFRICAN_COUNTRIES = [
  "Algeria",
  "Angola",
  "Benin",
  "Botswana",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cameroon",
  "Central African Republic",
  "Chad",
  "Comoros",
  "Congo",
  "Côte d'Ivoire",
  "Djibouti",
  "Egypt",
  "Equatorial Guinea",
  "Eritrea",
  "Eswatini",
  "Ethiopia",
  "Gabon",
  "Gambia",
  "Ghana",
  "Guinea",
  "Guinea-Bissau",
  "Kenya",
  "Lesotho",
  "Liberia",
  "Libya",
  "Madagascar",
  "Malawi",
  "Mali",
  "Mauritania",
  "Mauritius",
  "Morocco",
  "Mozambique",
  "Namibia",
  "Niger",
  "Nigeria",
  "Rwanda",
  "São Tomé and Príncipe",
  "Senegal",
  "Seychelles",
  "Sierra Leone",
  "Somalia",
  "South Africa",
  "South Sudan",
  "Sudan",
  "Tanzania",
  "Togo",
  "Tunisia",
  "Uganda",
  "Zambia",
  "Zimbabwe",
]

// List of interest categories
const INTEREST_CATEGORIES = [
  { id: "politics", label: "Politics" },
  { id: "business", label: "Business" },
  { id: "sports", label: "Sports" },
  { id: "entertainment", label: "Entertainment" },
  { id: "health", label: "Health" },
  { id: "technology", label: "Technology" },
  { id: "education", label: "Education" },
  { id: "environment", label: "Environment" },
  { id: "culture", label: "Culture" },
  { id: "travel", label: "Travel" },
]

export function ProfileEditor() {
  const { user, profile, updateProfile } = useUser()
  const { toast } = useToast()

  const [formState, setFormState] = useState({
    username: "",
    full_name: "",
    bio: "",
    website: "",
    country: "",
    interests: [] as string[],
  })

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [, startUploadTransition] = useTransition()

  // Initialize form with profile data when available
  useEffect(() => {
    if (profile) {
      setFormState({
        username: profile.username || "",
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        website: profile.website || "",
        country: profile.country || "",
        interests: profile.interests || [],
      })

      setAvatarUrl(profile.avatar_url)
    }
  }, [profile])

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value }))
    setHasChanges(true)

    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Handle country selection
  const handleCountryChange = (value: string) => {
    setFormState((prev) => ({ ...prev, country: value }))
    setHasChanges(true)
  }

  // Handle interest selection
  const handleInterestChange = (id: string, checked: boolean) => {
    setFormState((prev) => {
      const newInterests = checked ? [...prev.interests, id] : prev.interests.filter((interest) => interest !== id)

      return { ...prev, interests: newInterests }
    })
    setHasChanges(true)
  }

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return
    }

    const file = e.target.files[0]

    setUploading(true)

    startUploadTransition(async () => {
      try {
        const formData = new FormData()
        formData.append("file", file)

        const result = await uploadProfileAvatar(formData)

        if (result.error || !result.data) {
          throw (result.error ?? new Error("Failed to upload avatar"))
        }

        setAvatarUrl(result.data.avatarUrl)
        setHasChanges(true)

        toast({
          title: "Avatar uploaded",
          description: "Your profile picture has been updated.",
        })
      } catch (error: unknown) {
        const message = error instanceof ActionError ? error.message : (error as Error)?.message

        toast({
          title: "Upload failed",
          description: message || "Failed to upload avatar",
          variant: "destructive",
        })
      } finally {
        setUploading(false)
      }
    })
  }

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formState.username.trim()) {
      newErrors.username = "Username is required"
    } else if (formState.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters"
    }

    if (formState.website && !isValidUrl(formState.website)) {
      newErrors.website = "Please enter a valid URL"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Check if URL is valid
  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!hasChanges) return
    if (!validateForm()) return

    try {
      setIsUpdating(true)

      await updateProfile({
        username: formState.username,
        full_name: formState.full_name,
        bio: formState.bio,
        website: formState.website,
        country: formState.country,
        interests: formState.interests,
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

  // Get initials for avatar fallback
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
      {/* Avatar Section */}
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
            <div className="mt-2 flex items-center text-sm text-gray-500" role="status" aria-live="polite">
              <Loader2 className="mr-2 h-3 w-3 text-gray-500" aria-hidden="true" />
              <span>Uploading...</span>
            </div>
          )}
        </div>
      </div>

      {/* Basic Information */}
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

        <div className="space-y-2">
          <Label htmlFor="website" className="text-sm font-medium">
            Website
          </Label>
          <Input
            id="website"
            name="website"
            type="url"
            value={formState.website}
            onChange={handleChange}
            placeholder="https://example.com"
            className={errors.website ? "border-red-500" : ""}
          />
          {errors.website && <p className="text-xs text-red-500">{errors.website}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="country" className="text-sm font-medium">
            Country
          </Label>
          <Select value={formState.country} onValueChange={handleCountryChange}>
            <SelectTrigger id="country">
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NOT_SPECIFIED">Not specified</SelectItem>
              {AFRICAN_COUNTRIES.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio" className="text-sm font-medium">
          Bio
        </Label>
        <Textarea
          id="bio"
          name="bio"
          value={formState.bio}
          onChange={handleChange}
          rows={4}
          placeholder="Tell us about yourself..."
        />
        <p className="text-xs text-gray-500">Brief description for your profile. This may be visible to other users.</p>
      </div>

      {/* Interests */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Interests</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {INTEREST_CATEGORIES.map((category) => (
            <div key={category.id} className="flex items-center space-x-2">
              <Checkbox
                id={`interest-${category.id}`}
                checked={formState.interests.includes(category.id)}
                onCheckedChange={(checked) => handleInterestChange(category.id, checked as boolean)}
              />
              <Label htmlFor={`interest-${category.id}`} className="text-sm cursor-pointer">
                {category.label}
              </Label>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">Select topics you're interested in to personalize your news feed.</p>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isUpdating || !hasChanges || Object.keys(errors).length > 0}>
          {isUpdating ? (
            <span className="flex items-center" role="status" aria-live="polite">
              <Loader2 className="mr-2 h-4 w-4 text-blue-600" aria-hidden="true" />
              Updating...
            </span>
          ) : (
            "Update Profile"
          )}
        </Button>
      </div>
    </form>
  )
}
