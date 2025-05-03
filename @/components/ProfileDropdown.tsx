"use client"

import { useUser } from "@/contexts/UserContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function ProfileDropdown() {
  const { user, signOut } = useUser()

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 rounded-full">
          My Profile
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 max-h-[80vh] overflow-y-auto" align="end">
        <DropdownMenuLabel className="text-xs text-gray-500">Signed in as: {user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-medium text-gray-500">MY PROFILE SETTINGS</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/profile">My Profile Details</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/subscribe" className="cursor-pointer">
            Subscribe to News On Africa
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium text-gray-500">MY PERSONALISED SETTINGS</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/newsletters" className="cursor-pointer">
            My Newsletters
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/bookmarks" className="cursor-pointer">
            My Bookmarks
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/games" className="cursor-pointer">
            My Games
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/shared" className="cursor-pointer">
            My Shared Subscriber Articles
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/comments" className="cursor-pointer">
            My Comments
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/listen" className="cursor-pointer">
            Listen to Articles
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/editions" className="cursor-pointer">
            My e-Editions
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/weather" className="cursor-pointer">
            My Weather
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium text-gray-500">SUPPORT</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/about" className="cursor-pointer">
            About us
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/faq" className="cursor-pointer">
            FAQ
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/report-bug" className="cursor-pointer">
            Report a Bug
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/complaints" className="cursor-pointer">
            Editorial Complaints
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/contact" className="cursor-pointer">
            Contact us
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/subscription-help" className="cursor-pointer">
            Help with my Subscription
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/terms" className="cursor-pointer">
            Terms and Conditions
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/privacy" className="cursor-pointer">
            Privacy Policy
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/vulnerability" className="cursor-pointer">
            Vulnerability Disclosure
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-sm text-gray-500">083 394 2793</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => signOut()} className="text-red-600 cursor-pointer">
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
