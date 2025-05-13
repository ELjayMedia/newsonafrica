"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@/contexts/UserContext"
import type { Session } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { MobileProfileMenu } from "@/components/MobileProfileMenu"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { ProfileEditor } from "@/components/ProfileEditor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserCircle, Settings, BookmarkIcon, Bell, MessageSquare, Shield, Key, Eye, Mail } from "lucide-react"
import Link from "next/link"
import ErrorBoundary from "@/components/ErrorBoundary"

// Define valid section types for type safety
export type ProfileSection =
  | "profile"
  | "preferences"
  | "bookmarks"
  | "notifications"
  | "security"
  | "privacy"
  | "email"

interface ProfileContentProps {
  initialSession?: Session | null
}

export default function ProfileContent({ initialSession }: ProfileContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, profile, loading, isAuthenticated, signOut } = useUser()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { toast } = useToast()

  // Get section from URL or default to "profile"
  const sectionParam = searchParams.get("section") as ProfileSection | null
  const [activeTab, setActiveTab] = useState<ProfileSection>(
    sectionParam && isValidSection(sectionParam) ? sectionParam : "profile",
  )

  // Validate section parameter
  function isValidSection(section: string): section is ProfileSection {
    return ["profile", "preferences", "bookmarks", "notifications", "security", "privacy", "email"].includes(section)
  }

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    if (isValidSection(value)) {
      setActiveTab(value)
      // Update URL without full page reload
      const url = new URL(window.location.href)
      url.searchParams.set("section", value)
      window.history.pushState({}, "", url.toString())
    }
  }

  // Check if user is authenticated
  useEffect(() => {
    // If we have initial session data and user context has loaded but no user
    if (initialSession === null && !loading && !isAuthenticated) {
      router.push("/auth?redirectTo=/profile" + (sectionParam ? `?section=${sectionParam}` : ""))
    }
  }, [initialSession, loading, isAuthenticated, router, sectionParam])

  // Update active tab when URL changes
  useEffect(() => {
    if (sectionParam && isValidSection(sectionParam)) {
      setActiveTab(sectionParam)
    }
  }, [sectionParam])

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut()
      router.push("/")
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Error logging out",
        description: error.message || "Failed to log out",
        variant: "destructive",
      })
    }
  }

  // Show loading state
  if (loading) {
    return <ProfileLoadingState />
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-4">Please log in</h2>
        <p className="mb-6">You need to be logged in to view your profile.</p>
        <Button
          onClick={() => router.push("/auth?redirectTo=/profile" + (sectionParam ? `?section=${sectionParam}` : ""))}
        >
          Log in
        </Button>
      </div>
    )
  }

  // Show mobile profile menu on mobile devices
  if (isMobile && user) {
    return <MobileProfileMenu activeSection={activeTab} onSectionChange={handleTabChange} />
  }

  // Render the main profile content with tabs
  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto">
        <Tabs defaultValue="profile" value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="flex items-center gap-2">
              <BookmarkIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Bookmarks</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your profile information. This information may be visible to other users.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileEditor />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button variant="destructive" onClick={handleLogout}>
                Log Out
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Account Preferences</CardTitle>
                <CardDescription>Manage your account preferences and settings.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Email Preferences</h3>
                  <p>
                    Manage your email preferences in the{" "}
                    <Link href="/newsletters" className="text-blue-600 hover:underline">
                      Newsletters
                    </Link>{" "}
                    section.
                  </p>

                  <h3 className="text-lg font-medium">Privacy Settings</h3>
                  <p>Control who can see your profile and activity.</p>
                  <div className="mt-2">
                    <Button variant="outline" onClick={() => handleTabChange("privacy")}>
                      <Eye className="mr-2 h-4 w-4" />
                      Manage Privacy Settings
                    </Button>
                  </div>

                  <h3 className="text-lg font-medium">Security Settings</h3>
                  <p>Manage your account security and password.</p>
                  <div className="mt-2">
                    <Button variant="outline" onClick={() => handleTabChange("security")}>
                      <Shield className="mr-2 h-4 w-4" />
                      Manage Security Settings
                    </Button>
                  </div>

                  <h3 className="text-lg font-medium">Account Management</h3>
                  <div className="flex flex-col space-y-2 mt-2">
                    <Button variant="outline" asChild>
                      <Link href="/reset-password">
                        <Key className="mr-2 h-4 w-4" />
                        Change Password
                      </Link>
                    </Button>
                    <Button variant="outline" className="text-amber-600 border-amber-600 hover:bg-amber-50">
                      Download My Data
                    </Button>
                    <Button variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookmarks">
            <Card>
              <CardHeader>
                <CardTitle>Your Bookmarks</CardTitle>
                <CardDescription>View and manage your saved articles.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Manage your bookmarks</h3>
                  <p className="text-gray-500 mb-4">
                    View and manage your bookmarked articles in the dedicated bookmarks section.
                  </p>
                  <Button asChild>
                    <Link href="/bookmarks">Go to Bookmarks</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Manage your notification preferences.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Notification Preferences</h3>
                  <p>Choose which notifications you want to receive.</p>
                  <div className="space-y-2">
                    {/* Notification preferences would go here */}
                    <p className="text-sm text-gray-500">Notification preferences will be available soon.</p>
                  </div>

                  <h3 className="text-lg font-medium">Email Notifications</h3>
                  <p>Manage email notification settings.</p>
                  <div className="mt-2">
                    <Button variant="outline" onClick={() => handleTabChange("email")}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Additional tabs that are accessible via direct links */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your account security.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Password</h3>
                  <p>Change your password or set up two-factor authentication.</p>
                  <div className="mt-2">
                    <Button variant="outline" asChild>
                      <Link href="/reset-password">Change Password</Link>
                    </Button>
                  </div>

                  <h3 className="text-lg font-medium">Login History</h3>
                  <p>View your recent login activity.</p>
                  <div className="mt-2 border rounded-md p-4">
                    <p className="text-sm text-gray-500">Login history will be available soon.</p>
                  </div>

                  <h3 className="text-lg font-medium">Connected Accounts</h3>
                  <p>Manage social accounts connected to your profile.</p>
                  <div className="mt-2 border rounded-md p-4">
                    <p className="text-sm text-gray-500">Connected accounts will be available soon.</p>
                  </div>

                  <Button variant="outline" onClick={() => handleTabChange("preferences")}>
                    Back to Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>Control who can see your profile and activity.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Profile Visibility</h3>
                  <p>Control who can see your profile information.</p>
                  <div className="mt-2 border rounded-md p-4">
                    <p className="text-sm text-gray-500">Profile visibility settings will be available soon.</p>
                  </div>

                  <h3 className="text-lg font-medium">Activity Privacy</h3>
                  <p>Control who can see your activity on the platform.</p>
                  <div className="mt-2 border rounded-md p-4">
                    <p className="text-sm text-gray-500">Activity privacy settings will be available soon.</p>
                  </div>

                  <h3 className="text-lg font-medium">Data Usage</h3>
                  <p>Control how your data is used for personalization and recommendations.</p>
                  <div className="mt-2 border rounded-md p-4">
                    <p className="text-sm text-gray-500">Data usage settings will be available soon.</p>
                  </div>

                  <Button variant="outline" onClick={() => handleTabChange("preferences")}>
                    Back to Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>Email Settings</CardTitle>
                <CardDescription>Manage your email notifications and preferences.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Email Notifications</h3>
                  <p>Choose which email notifications you want to receive.</p>
                  <div className="mt-2 border rounded-md p-4">
                    <p className="text-sm text-gray-500">Email notification settings will be available soon.</p>
                  </div>

                  <h3 className="text-lg font-medium">Newsletter Subscriptions</h3>
                  <p>Manage your newsletter subscriptions.</p>
                  <div className="mt-2">
                    <Button variant="outline" asChild>
                      <Link href="/newsletters">Manage Newsletters</Link>
                    </Button>
                  </div>

                  <h3 className="text-lg font-medium">Email Address</h3>
                  <p>Update your email address or add a backup email.</p>
                  <div className="mt-2 border rounded-md p-4">
                    <p className="text-sm text-gray-500">Email address management will be available soon.</p>
                  </div>

                  <Button variant="outline" onClick={() => handleTabChange("notifications")}>
                    Back to Notifications
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  )
}

function ProfileLoadingState() {
  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center mb-8">
        <Skeleton className="w-20 h-20 rounded-full mr-4" />
        <div>
          <Skeleton className="h-7 w-40 mb-2" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>

      <Skeleton className="h-12 w-full mb-8" />

      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>

      <div className="flex justify-end pt-4">
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}
