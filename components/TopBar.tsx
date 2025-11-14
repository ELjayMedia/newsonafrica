"use client"

import Link from "next/link"
import { BookmarkIcon, LogIn } from "lucide-react"

import { ProfileDropdown } from "@/components/ProfileDropdown"
import { Button } from "@/components/ui/button"
import { Container, Flex } from "@/components/ui/grid"
import { useAuth } from "@/hooks/useAuth"

export function TopBar() {
  const { user, loading } = useAuth()

  return (
    <div className="hidden bg-foreground text-background md:block">
      <Container size="2xl" className="max-w-[980px] py-2">
        <Flex justify="between" align="center" className="gap-4" wrap>
          <nav className="flex gap-4">
           
            <Link
              href="/partners"
              className="text-sm font-medium text-background/80 transition hover:text-background"
            >
              Partners
            </Link>
                 
          </nav>
          <Flex align="center" className="gap-3" wrap>
            {loading ? (
              <div className="h-9 w-28 rounded-full bg-background/20" />
            ) : (
              <>
                <Button asChild variant="success" size="sm" className="rounded-full px-5 font-semibold text-success-foreground">
                  <Link href="/subscribe">Subscribe</Link>
                </Button>
                {user ? (
                  <Flex align="center" className="gap-2">
                    <Button asChild variant="ghost" size="icon-sm" className="text-background hover:bg-background/15">
                      <Link href="/bookmarks">
                        <BookmarkIcon className="h-4 w-4" />
                        <span className="sr-only">Bookmarks</span>
                      </Link>
                    </Button>
                    <ProfileDropdown />
                  </Flex>
                ) : (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="gap-2 rounded-full text-background hover:bg-background/15"
                  >
                    <Link href="/auth?tab=signin">
                      <LogIn className="h-4 w-4" />
                      <span>Sign In</span>
                    </Link>
                  </Button>
                )}
              </>
            )}
          </Flex>
        </Flex>
      </Container>
    </div>
  )
}
