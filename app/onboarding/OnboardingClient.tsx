import logger from '@/utils/logger'
"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useUser } from "@/contexts/UserContext"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/hooks/use-toast"
import { Loader2, Upload, ChevronRight, CheckCircle } from "lucide-react"
import Image from "next/image"

export function OnboardingClient() {
  const { user, profile, updateProfile, loading } = useUser()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    bio: "",
    location: "",
    interests: [] as string[],
    avatarUrl: "",
    avatarFile: null as File | null,
    receiveNewsletter: true,
  })

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth?redirectTo=/onboarding")
    } else if (profile) {
      // Pre-fill form with existing profile data
      setFormData((prev) => ({
        ...prev,
        fullName: profile.full_name || "",
        bio: profile.bio || "",
        location: profile.location || "",
        avatarUrl: profile.avatar_url || "",
        interests: profile.interests || [],
        receiveNewsletter: profile.preferences?.receiveNewsletter ?? true,
      }))
    }
  }, [loading, user, profile, router])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setFormData({
        ...formData,
        avatarFile: file,
        avatarUrl: URL.createObjectURL(file),
      })
    }
  }

  const handleInterestToggle = (interest: string) => {
    setFormData((prev) => {
      const interests = prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest]
      return { ...prev, interests }
    })
  }

  const handleSubmit = async () => {
    if (!user) return

    setIsSubmitting(true)

    try {
      // Upload avatar if changed
      let avatarUrl = formData.avatarUrl
      if (formData.avatarFile) {
        // Create a FormData object to upload the file
        const uploadData = new FormData()
        uploadData.append("avatar", formData.avatarFile)

        // Upload the file
        const uploadRes = await fetch("/api/user/upload-avatar", {
          method: "POST",
          body: uploadData,
        })

        if (!uploadRes.ok) {
          throw new Error("Failed to upload avatar")
        }

        const { url } = await uploadRes.json()
        avatarUrl = url
      }

      // Update profile
      await updateProfile({
        full_name: formData.fullName,
        bio: formData.bio,
        location: formData.location,
        avatar_url: avatarUrl,
        interests: formData.interests,
        preferences: {
          receiveNewsletter: formData.receiveNewsletter,
        },
        onboarded: true,
      })

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      })

      // Redirect to personalized feed
      router.push("/for-you")
    } catch (error) {
      logger.error("Error updating profile:", error)
      toast({
        title: "Error updating profile",
        description: "There was a problem updating your profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    setStep((prev) => prev + 1)
    window.scrollTo(0, 0)
  }

  const handleBack = () => {
    setStep((prev) => prev - 1)
    window.scrollTo(0, 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  const interests = [
    "Politics",
    "Business",
    "Technology",
    "Health",
    "Sports",
    "Entertainment",
    "Science",
    "Environment",
    "Education",
    "Culture",
    "Travel",
    "Food",
    "Fashion",
    "Music",
    "Art",
    "Literature",
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Complete Your Profile</h1>
              <div className="text-sm text-gray-500">Step {step} of 3</div>
            </div>
            <div className="w-full bg-gray-200 h-2 mt-4 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 ease-in-out"
                style={{ width: `${(step / 3) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="p-6">
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold mb-2">Basic Information</h2>
                  <p className="text-gray-500">Let's start with some basic information about you</p>
                </div>

                <div className="flex flex-col items-center mb-6">
                  <div className="relative mb-4">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={formData.avatarUrl || "/placeholder.svg"} />
                      <AvatarFallback className="text-lg bg-blue-600">
                        {formData.fullName
                          ? formData.fullName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                          : user?.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="avatar-upload"
                      className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-blue-700 transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                  <p className="text-sm text-gray-500">Upload a profile picture (optional)</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Tell us a bit about yourself"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="City, Country"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold mb-2">Your Interests</h2>
                  <p className="text-gray-500">Select topics you're interested in to personalize your news feed</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {interests.map((interest) => (
                    <div
                      key={interest}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        formData.interests.includes(interest) ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleInterestToggle(interest)}
                    >
                      <div className="flex items-center">
                        <Checkbox
                          checked={formData.interests.includes(interest)}
                          onCheckedChange={() => handleInterestToggle(interest)}
                          className="mr-2"
                          id={`interest-${interest}`}
                        />
                        <Label htmlFor={`interest-${interest}`} className="cursor-pointer font-normal text-sm">
                          {interest}
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-gray-500 italic">
                  You can always update your interests later in your profile settings.
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold mb-2">Almost Done!</h2>
                  <p className="text-gray-500">Just a few more preferences to set up your account</p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Checkbox
                      id="newsletter"
                      checked={formData.receiveNewsletter}
                      onCheckedChange={(checked) => setFormData({ ...formData, receiveNewsletter: checked === true })}
                    />
                    <div>
                      <Label htmlFor="newsletter" className="font-medium">
                        Subscribe to our newsletter
                      </Label>
                      <p className="text-sm text-gray-500 mt-1">
                        Receive a weekly digest of the top stories across Africa, curated just for you.
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2 text-blue-600" />
                      Your personalized news feed is ready!
                    </h3>
                    <p className="text-blue-700 text-sm mb-4">
                      Based on your interests, we've created a personalized news feed just for you. Complete your
                      profile to start exploring stories that matter to you.
                    </p>
                    <Image
                      src="/placeholder-oi376.png"
                      alt="Personalized news feed preview"
                      width={400}
                      height={120}
                      className="rounded-md w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t bg-gray-50 flex justify-between">
            {step > 1 ? (
              <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
                Back
              </Button>
            ) : (
              <div></div>
            )}

            {step < 3 ? (
              <Button onClick={handleNext} disabled={isSubmitting}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Complete Profile"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
