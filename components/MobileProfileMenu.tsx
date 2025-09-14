"use client"

import { useUser } from "@/contexts/UserContext"
import { Button } from "@/components/ui/button"
import { ArrowLeft, UserCircle, Settings, BookmarkIcon, Bell, MessageSquare, LogOut } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

export function MobileProfileMenu() {
  const router = useRouter()
  const { user, profile, signOut } = useUser()
  const { toast } = useToast()

  if (!user) return null

  const handleLogout = async () => {
    try {
      await signOut()
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      })
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      })
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
    <div className="min-h-screen bg-gray-50">
      <div className="fixed top-0 left-0 right-0 bg-white z-10 p-4 flex items-center border-b">
        <button onClick={() => router.back()} className="p-2 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold ml-4">Profile</h1>
      </div>

      <div className="pt-20 px-4 pb-20">
        {/* User Profile Header */}
        <div className="flex items-center space-x-4 mb-6 p-4 bg-white rounded-lg shadow-sm">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.username || "User"} />
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
          <div>
            <h2 className="font-semibold">{profile?.full_name || profile?.username || "User"}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            {profile?.country && <p className="text-xs text-gray-500 mt-1">{profile.country}</p>}
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <section>
            <h2 className="text-xs font-medium text-gray-500 mb-2 px-1">PROFILE</h2>
            <div className="space-y-1">
              <Link href="/profile" className="flex items-center p-3 bg-white rounded-lg text-blue-800 font-medium">
                <UserCircle className="h-5 w-5 mr-3 text-blue-600" />
                Edit Profile
              </Link>
              <Link
                href="/profile/preferences"
                className="flex items-center p-3 bg-white rounded-lg text-blue-800 font-medium"
              >
                <Settings className="h-5 w-5 mr-3 text-blue-600" />
                Preferences
              </Link>
            </div>
          </section>

          {/* My Content Section */}
          <section>
            <h2 className="text-xs font-medium text-gray-500 mb-2 px-1">MY CONTENT</h2>
            <div className="space-y-1">
              <Link href="/bookmarks" className="flex items-center p-3 bg-white rounded-lg text-blue-800 font-medium">
                <BookmarkIcon className="h-5 w-5 mr-3 text-blue-600" />
                My Bookmarks
              </Link>
              <Link href="/comments" className="flex items-center p-3 bg-white rounded-lg text-blue-800 font-medium">
                <MessageSquare className="h-5 w-5 mr-3 text-blue-600" />
                My Comments
              </Link>
            </div>
          </section>

          {/* Notifications Section */}
          <section>
            <h2 className="text-xs font-medium text-gray-500 mb-2 px-1">NOTIFICATIONS</h2>
            <div className="space-y-1">
              <Link href="/newsletters" className="flex items-center p-3 bg-white rounded-lg text-blue-800 font-medium">
                <Bell className="h-5 w-5 mr-3 text-blue-600" />
                Newsletter Preferences
              </Link>
            </div>
          </section>

          <Separator className="my-4" />

          {/* Account Section */}
          <section>
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sign Out
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
