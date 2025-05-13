"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/UserContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import type { Session } from "@supabase/supabase-js"

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

export default function ProfileCompletionContent({ initialSession }: { initialSession: Session | null }) {
  const { user, profile, updateProfile, loading: userLoading } = useUser()
  const { toast } = useToast()
  const router = useRouter()

  const [formState, setFormState] = useState({
    username: "",
    full_name: "",
    country: "",
    interests: [] as string[],
  })

  const [isUpdating, setIsUpdating] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form with profile data when available
  useEffect(() => {
    if (profile) {
      setFormState({
        username: profile.username || generateUsernameFromEmail(user?.email || ""),
        full_name: profile.full_name || user?.user_metadata?.full_name || "",
        country: profile.country || "",
        interests: profile.interests || [],
      })
    } else if (user) {
      // If we have a user but no profile, pre-fill with user metadata
      setFormState({
        username: generateUsernameFromEmail(user.email || ""),
        full_name: user.user_metadata?.full_name || "",
        country: "",
        interests: [],
      })
    }
  }, [profile, user])

  // Generate a username from email
  function generateUsernameFromEmail(email: string): string {
    if (!email) return ""
    // Take the part before @ and remove special characters
    return email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "")
  }

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value }))

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
  }

  // Handle interest selection
  const handleInterestChange = (id: string, checked: boolean) => {
    setFormState((prev) => {
      const newInterests = checked ? [...prev.interests, id] : prev.interests.filter((interest) => interest !== id)

      return { ...prev, interests: newInterests }
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

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setIsUpdating(true)

      await updateProfile({
        username: formState.username,
        full_name: formState.full_name,
        country: formState.country,
        interests: formState.interests,
      })

      toast({
        title: "Profile updated",
        description: "Your profile has been completed successfully.",
      })

      // Redirect to the stored path or homepage
      const redirectPath = sessionStorage.getItem("redirectAfterProfileCompletion") || "/"
      sessionStorage.removeItem("redirectAfterProfileCompletion")
      router.push(redirectPath)
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

  // Skip profile completion
  const handleSkip = () => {
    const redirectPath = sessionStorage.getItem("redirectAfterProfileCompletion") || "/"
    sessionStorage.removeItem("redirectAfterProfileCompletion")
    router.push(redirectPath)
  }

  if (userLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Welcome to News On Africa!</h2>
        <p className="text-gray-500">
          Please take a moment to complete your profile. This helps us personalize your experience.
        </p>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
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

      {/* Interests */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Interests</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

      {/* Submit Buttons */}
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={handleSkip}>
          Skip for now
        </Button>
        <Button type="submit" disabled={isUpdating || Object.keys(errors).length > 0}>
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Complete Profile"
          )}
        </Button>
      </div>
    </form>
  )
}
