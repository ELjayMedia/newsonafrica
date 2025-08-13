'use client';

import { Home, Search, Bookmark, User, Bell } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function CompactBottomNav() {
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part?.[0] || '')
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const displayName = profile?.full_name || profile?.username || user?.email?.split('@')[0] || '';

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/search', icon: Search, label: 'Search' },
    { href: '/bookmarks', icon: Bookmark, label: 'Saved' },
    { href: '/notifications', icon: Bell, label: 'Alerts', badge: 3 },
    { href: user ? '/profile' : '/auth', icon: User, label: 'Profile', isProfile: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden">
      <div className="flex justify-around items-center py-1 px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center min-w-0 flex-1 py-1 relative"
            >
              <div className="relative">
                {item.isProfile && user && !loading ? (
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                    <AvatarFallback className="text-xs bg-blue-600 text-white">
                      {displayName ? getInitials(displayName) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Icon
                    size={18}
                    className={cn(
                      'transition-colors',
                      isActive ? 'text-blue-600' : 'text-gray-500',
                    )}
                  />
                )}
                {item.badge && item.badge > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-3 w-3 p-0 text-xs flex items-center justify-center"
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                )}
              </div>
              <span
                className={cn(
                  'text-xs mt-0.5 truncate max-w-full',
                  isActive ? 'text-blue-600 font-medium' : 'text-gray-500',
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
