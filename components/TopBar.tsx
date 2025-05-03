"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useUser } from "@/contexts/UserContext"
import { ProfileDropdown } from "@/components/ProfileDropdown"

export function TopBar() {
  const { user, signOut } = useUser()

  return (
    <div className="bg-black text-white hidden md:block">
      <div className="mx-auto max-w-[980px] px-4 py-2 flex justify-between items-center">
        <div className="text-sm">
          <span className="hidden sm:inline">Stay informed. </span>
          Subscribe for full access.
        </div>
        <div className="flex items-center space-x-2">
          {user ? (
            <>
              <ProfileDropdown />
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" className="text-white border-white rounded-full">
                <Link href="/subscribe" className="no-underline">
                  Subscribe
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 rounded-full">
                <Link href="/auth">Sign In</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
