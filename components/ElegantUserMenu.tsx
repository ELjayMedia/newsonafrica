"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/UserContext"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { Settings, BookmarkIcon, CreditCard, LogOut, UserCircle, Bell } from "lucide-react"
import Link from "next/link"

export function ElegantUserMenu() {
  const { user, profile, signOut, isAuthenticated } = useUser()
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await signOut()
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully.",
      })
      router.push("/")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign out.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="text-gray-600 hover:text-amber-600 hover:bg-amber-50">
          <Link href="/auth">Sign In</Link>
        </Button>
        <Button
          size="sm"
          asChild
          className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
        >
          <Link href="/auth?tab=signup">Join Us</Link>
        </Button>
      </div>
    )
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
          <Avatar className="h-10 w-10 border-2 border-amber-200">
            <AvatarImage src={profile?.avatar_url || ""} alt={profile?.username || "User"} />
            <AvatarFallback className="bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64 p-2" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12 border-2 border-amber-200">
                <AvatarImage src={profile?.avatar_url || ""} alt={profile?.username || "User"} />
                <AvatarFallback className="bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 font-medium">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <p className="text-sm font-medium leading-none text-gray-900">
                  {profile?.full_name || profile?.username || "User"}
                </p>
                <p className="text-xs leading-none text-gray-500 mt-1">{user?.email}</p>
              </div>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center cursor-pointer">
            <UserCircle className="mr-3 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/bookmarks" className="flex items-center cursor-pointer">
            <BookmarkIcon className="mr-3 h-4 w-4" />
            <span>Bookmarks</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/subscriptions" className="flex items-center cursor-pointer">
            <CreditCard className="mr-3 h-4 w-4" />
            <span>Subscriptions</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/notifications" className="flex items-center cursor-pointer">
            <Bell className="mr-3 h-4 w-4" />
            <span>Notifications</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/profile?tab=preferences" className="flex items-center cursor-pointer">
            <Settings className="mr-3 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isLoading}
          className="flex items-center cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <LogOut className="mr-3 h-4 w-4" />
          <span>{isLoading ? "Signing out..." : "Sign Out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
