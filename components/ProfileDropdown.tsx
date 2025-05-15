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
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ChevronDown,
  User,
  LogOut,
  Settings,
  BookOpen,
  Mail,
  Users,
  Bell,
  Bookmark,
  Radio,
  CloudRain,
  HelpCircle,
  FileText,
  Phone,
  Shield,
  AlertTriangle,
  Newspaper,
} from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"

export function ProfileDropdown() {
  const { user, profile, signOut } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [isSubscriber, setIsSubscriber] = useState(false)

  useEffect(() => {
    // Check subscription status
    if (user) {
      const checkSubscription = async () => {
        try {
          const res = await fetch("/api/user/subscription")
          if (res.ok) {
            const data = await res.json()
            setIsSubscriber(data.isActive)
          }
        } catch (error) {
          console.error("Error checking subscription:", error)
        }
      }

      checkSubscription()
    }
  }, [user])

  if (!user) return null

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part?.[0] || "")
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
        duration: 3000,
      })
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "Error signing out",
        description: "There was a problem signing you out. Please try again.",
        variant: "destructive",
      })
    }
  }

  const displayName = profile?.full_name || profile?.username || user.email?.split("@")[0] || ""

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 rounded-full flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
            <AvatarFallback className="text-xs bg-blue-600">
              {displayName ? getInitials(displayName) : "U"}
            </AvatarFallback>
          </Avatar>
          <span>My Profile</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 max-h-[85vh] overflow-y-auto" align="end">
        <div className="p-3 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
              <AvatarFallback className="text-sm bg-blue-600">
                {displayName ? getInitials(displayName) : "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p className="font-medium">{displayName}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>

          {isSubscriber ? (
            <div className="mt-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full inline-block">
              Active Subscriber
            </div>
          ) : (
            <Link href="/subscribe">
              <Button variant="outline" size="sm" className="mt-2 w-full text-xs">
                Subscribe Now
              </Button>
            </Link>
          )}
        </div>

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer flex items-center">
              <User className="h-4 w-4 mr-2" />
              My Profile
              {pathname === "/profile" && <DropdownMenuShortcut>✓</DropdownMenuShortcut>}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/bookmarks" className="cursor-pointer">
              <Bookmark className="h-4 w-4 mr-2" />
              My Bookmarks
              {pathname === "/bookmarks" && <DropdownMenuShortcut>✓</DropdownMenuShortcut>}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/notifications" className="cursor-pointer">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
              {pathname === "/notifications" && <DropdownMenuShortcut>✓</DropdownMenuShortcut>}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium text-gray-500">MY CONTENT</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/newsletters" className="cursor-pointer">
              <Mail className="h-4 w-4 mr-2" />
              My Newsletters
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/comments" className="cursor-pointer">
              <Users className="h-4 w-4 mr-2" />
              My Comments
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/shared" className="cursor-pointer">
              <BookOpen className="h-4 w-4 mr-2" />
              Shared Articles
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/listen" className="cursor-pointer">
              <Radio className="h-4 w-4 mr-2" />
              Listen to Articles
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/editions" className="cursor-pointer">
              <Newspaper className="h-4 w-4 mr-2" />
              My e-Editions
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/weather" className="cursor-pointer">
              <CloudRain className="h-4 w-4 mr-2" />
              My Weather
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium text-gray-500">PREFERENCES</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <Settings className="h-4 w-4 mr-2" />
              Account Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium text-gray-500">SUPPORT</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/faq" className="cursor-pointer">
              <HelpCircle className="h-4 w-4 mr-2" />
              FAQ
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/terms" className="cursor-pointer">
              <FileText className="h-4 w-4 mr-2" />
              Terms and Conditions
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/privacy" className="cursor-pointer">
              <Shield className="h-4 w-4 mr-2" />
              Privacy Policy
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/contact" className="cursor-pointer">
              <Phone className="h-4 w-4 mr-2" />
              Contact Us
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/report-bug" className="cursor-pointer">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Report a Bug
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer flex items-center gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
