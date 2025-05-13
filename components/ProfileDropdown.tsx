"use client"

import { useUser } from "@/contexts/UserContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  User,
  CreditCard,
  Bell,
  Bookmark,
  MessageSquare,
  Headphones,
  CloudSun,
  HelpCircle,
  FileText,
  Phone,
  LogOut,
  Mail,
  Gamepad2,
  Share2,
  Newspaper,
  Settings,
  UserCog,
  PenSquare,
  Globe,
  Heart,
  Shield,
  Key,
  Eye,
  BellRing,
  Palette,
} from "lucide-react"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"

export function ProfileDropdown() {
  const { user, profile, signOut } = useUser()
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [isSubscriber, setIsSubscriber] = useState(false)
  const router = useRouter()

  // Check if user is a subscriber - this would be replaced with actual subscription check
  useEffect(() => {
    // Mock subscription check - replace with actual API call
    if (user) {
      // Simulate API call to check subscription status
      const checkSubscription = async () => {
        try {
          // This would be an actual API call in production
          // const { data } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).single();
          // setIsSubscriber(!!data && new Date(data.expires_at) > new Date());

          // For demo purposes, randomly set subscription status
          setIsSubscriber(Math.random() > 0.5)
        } catch (error) {
          console.error("Error checking subscription:", error)
        }
      }

      checkSubscription()

      // Mock notification count - replace with actual notification count
      setUnreadNotifications(Math.floor(Math.random() * 5))
    }
  }, [user])

  if (!user) return null

  // Get initials for avatar fallback
  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    }
    return user.email?.substring(0, 2).toUpperCase() || "NA"
  }

  // Navigate to profile page with specific section active
  const goToProfileSection = (section: string) => {
    router.push(`/profile?section=${section}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-1 hover:bg-white/20 rounded-full">
          <Avatar className="h-8 w-8 mr-1">
            <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || user.email || "User"} />
            <AvatarFallback className="bg-blue-600 text-white">{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-medium">{profile?.full_name || profile?.username || "My Profile"}</span>
            {isSubscriber && (
              <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                Subscriber
              </Badge>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 max-h-[80vh] overflow-y-auto" align="end">
        <div className="flex items-center gap-2 p-2">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || user.email || "User"} />
            <AvatarFallback className="bg-blue-600 text-white">{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{profile?.full_name || profile?.username || "User"}</span>
            <span className="text-xs text-gray-500">{user.email}</span>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => router.push("/profile")}>
            View Profile
          </Button>
        </div>

        <DropdownMenuSeparator />

        {/* Profile Management */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-medium text-gray-500">PROFILE MANAGEMENT</DropdownMenuLabel>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <UserCog className="mr-2 h-4 w-4" />
              <span>Edit Profile</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => goToProfileSection("personal")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Personal Information</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => goToProfileSection("avatar")}>
                  <PenSquare className="mr-2 h-4 w-4" />
                  <span>Profile Picture</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => goToProfileSection("bio")}>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Bio & Description</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => goToProfileSection("location")}>
                  <Globe className="mr-2 h-4 w-4" />
                  <span>Location & Timezone</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => goToProfileSection("interests")}>
                  <Heart className="mr-2 h-4 w-4" />
                  <span>Interests & Topics</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Account Settings</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => goToProfileSection("security")}>
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Security Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => goToProfileSection("password")}>
                  <Key className="mr-2 h-4 w-4" />
                  <span>Change Password</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => goToProfileSection("privacy")}>
                  <Eye className="mr-2 h-4 w-4" />
                  <span>Privacy Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => goToProfileSection("notifications")}>
                  <BellRing className="mr-2 h-4 w-4" />
                  <span>Notification Preferences</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => goToProfileSection("appearance")}>
                  <Palette className="mr-2 h-4 w-4" />
                  <span>Appearance Settings</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuItem asChild>
            <Link href="/subscribe" className="cursor-pointer flex items-center">
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Subscription Management</span>
              {!isSubscriber && <Badge className="ml-auto bg-blue-500 text-white">Upgrade</Badge>}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Quick Actions */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-medium text-gray-500">QUICK ACTIONS</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href="/bookmarks" className="cursor-pointer flex items-center">
              <Bookmark className="mr-2 h-4 w-4" />
              <span>My Bookmarks</span>
              <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/notifications" className="cursor-pointer flex items-center">
              <Bell className="mr-2 h-4 w-4" />
              <span>Notifications</span>
              {unreadNotifications > 0 && (
                <Badge className="ml-auto bg-red-500 text-white">{unreadNotifications}</Badge>
              )}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/comments" className="cursor-pointer flex items-center">
              <MessageSquare className="mr-2 h-4 w-4" />
              <span>My Comments</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Personalized Settings */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-medium text-gray-500">MY PERSONALISED SETTINGS</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href="/newsletters" className="cursor-pointer flex items-center">
              <Mail className="mr-2 h-4 w-4" />
              <span>My Newsletters</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/games" className="cursor-pointer flex items-center">
              <Gamepad2 className="mr-2 h-4 w-4" />
              <span>My Games</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/shared" className="cursor-pointer flex items-center">
              <Share2 className="mr-2 h-4 w-4" />
              <span>My Shared Articles</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/listen" className="cursor-pointer flex items-center">
              <Headphones className="mr-2 h-4 w-4" />
              <span>Listen to Articles</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/editions" className="cursor-pointer flex items-center">
              <Newspaper className="mr-2 h-4 w-4" />
              <span>My e-Editions</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/weather" className="cursor-pointer flex items-center">
              <CloudSun className="mr-2 h-4 w-4" />
              <span>My Weather</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Support */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-medium text-gray-500">SUPPORT</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href="/help" className="cursor-pointer flex items-center">
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Help Center</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/contact" className="cursor-pointer flex items-center">
              <Phone className="mr-2 h-4 w-4" />
              <span>Contact Support</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut()} className="text-red-600 cursor-pointer flex items-center">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
