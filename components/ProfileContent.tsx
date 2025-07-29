"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthProvider"
import type { Session } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { MobileProfileMenu } from "@/components/MobileProfileMenu"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { ProfileEditor } from "@/components/ProfileEditor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserCircle, Settings, BookmarkIcon, Bell, MessageSquare } from "lucide-react"
import Link from "next/link"
import ErrorBoundary from "@/components/ErrorBoundary"

interface ProfileContentProps {
  initialSession?: Session | null
}

export default function ProfileContent({ initialSession }: ProfileContentProps) {
  const router = useRouter()
  const { user, profile, loading, isAuthenticated, signOut } = useAuth()
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("profile")

  // Check if user is authenticated
  useEffect(() => {
    // If we have initial session data and user context has loaded but no user
    if (initialSession === null && !loading && !isAuthenticated) {
      router.push("/auth?redirectTo=/profile")
    }
  }, [initialSession, loading, isAuthenticated, router])

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
        <Button onClick={() => router.push("/auth?redirectTo=/profile")}>Log in</Button>
      </div>
    )
  }

  // Show mobile profile menu on mobile devices
  if (isMobile && user) {
    return <MobileProfileMenu />
  }

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto">
        <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                  <p>Coming soon: Control who can see your profile and activity.</p>

                  <h3 className="text-lg font-medium">Account Management</h3>
                  <div className="flex flex-col space-y-2 mt-2">
                    <Button variant="outline" asChild>
                      <Link href="/reset-password">Change Password</Link>
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
                  <h3 className="text-lg font-medium">Coming Soon</h3>
                  <p>Notification settings will be available soon. You'll be able to control:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Breaking news alerts</li>
                    <li>Comment notifications</li>
                    <li>Newsletter notifications</li>
                    <li>Account updates</li>
                  </ul>
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
