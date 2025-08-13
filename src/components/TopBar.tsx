'use client';

import { Bell, BookmarkIcon, LogIn } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { NotificationBadge } from '@/components/NotificationBadge';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export function TopBar() {
  const { user, profile, loading } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const pathname = usePathname();

  // Show welcome message for 5 seconds after login
  useEffect(() => {
    // Check if we just logged in (via URL parameter)
    const params = new URLSearchParams(window.location.search);
    const justLoggedIn = params.get('loggedIn') === 'true';

    if (justLoggedIn && user) {
      setShowWelcome(true);

      // Remove the query parameter without page reload
      const newUrl =
        window.location.pathname +
        (window.location.search
          ? window.location.search.replace('loggedIn=true', '').replace(/(\?|&)$/, '')
          : '');
      window.history.replaceState({}, '', newUrl);

      // Hide welcome message after 5 seconds
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [user, pathname]);

  return (
    <div className="bg-black text-white hidden md:block">
      <div className="mx-auto max-w-[980px] px-4 py-2 flex justify-between items-center">
        <div className="text-sm">
          {showWelcome && user ? (
            <span className="text-green-400 font-medium">
              Welcome back, {profile?.full_name || profile?.username || user.email?.split('@')[0]}!
            </span>
          ) : (
            <span>
              <span className="hidden sm:inline">Stay informed. </span>
              Subscribe for full access.
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {loading ? (
            <div className="h-8 w-24 bg-gray-700 animate-pulse rounded-full"></div>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="bg-green-500 text-black border-green-500 hover:bg-green-600 hover:text-black hover:border-green-600 rounded-full"
              >
                <Link href="/subscribe" className="no-underline">
                  Subscribe
                </Link>
              </Button>

              {user ? (
                <div className="flex items-center space-x-2">
                  <Link href="/bookmarks">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-8 w-8 text-white hover:bg-white/20"
                    >
                      <BookmarkIcon className="h-4 w-4" />
                      <span className="sr-only">Bookmarks</span>
                    </Button>
                  </Link>

                  <Link href="/notifications">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-8 w-8 text-white hover:bg-white/20 relative"
                    >
                      <Bell className="h-4 w-4" />
                      <NotificationBadge />
                      <span className="sr-only">Notifications</span>
                    </Button>
                  </Link>

                  <ProfileDropdown />
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link href="/auth?tab=signin" className="no-underline">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 rounded-full flex items-center gap-1.5"
                    >
                      <LogIn className="h-4 w-4" />
                      <span>Sign In</span>
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
