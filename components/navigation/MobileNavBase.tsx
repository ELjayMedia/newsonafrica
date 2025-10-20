"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { getHomeHref } from "@/lib/utils/routing"
import { Home, Search, Grid, Bookmark, User } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { Profile } from "@/app/actions/auth"

export type MobileNavItemKey = "home" | "search" | "discover" | "bookmarks" | "profile"

interface NavItemDefinition {
  key: MobileNavItemKey
  label: string
  icon: LucideIcon
  isProfile?: boolean
  hideWhenUnauthenticated?: boolean
  getHref: (context: NavContext) => string
  getActivePaths?: (context: NavContext & { href: string }) => string[]
}

interface NavContext {
  homeHref: string
  user: SupabaseUser | null
}

export interface MobileNavItemOverride {
  label?: string
  href?: string
  badge?: number
  hideWhenUnauthenticated?: boolean
  activePaths?: string[]
}

export interface MobileNavItem {
  key: MobileNavItemKey
  href: string
  label: string
  icon: LucideIcon
  isProfile?: boolean
  hideWhenUnauthenticated?: boolean
  badge?: number
  activePaths: string[]
  isActive: boolean
}

export interface UseMobileNavigationOptions {
  items?: MobileNavItemKey[]
  itemOverrides?: Partial<Record<MobileNavItemKey, MobileNavItemOverride>>
}

export interface UseMobileNavigationResult {
  items: MobileNavItem[]
  pathname: string
  isAuthenticated: boolean
  user: SupabaseUser | null
  profile: Profile | null
  loading: boolean
  displayName: string
  getInitials: (name: string) => string
}

const NAV_ITEM_DEFINITIONS: Record<MobileNavItemKey, NavItemDefinition> = {
  home: {
    key: "home",
    label: "Home",
    icon: Home,
    getHref: ({ homeHref }) => homeHref || "/",
    getActivePaths: ({ href }) => [href, "/"],
  },
  search: {
    key: "search",
    label: "Search",
    icon: Search,
    getHref: () => "/search",
  },
  discover: {
    key: "discover",
    label: "Discover",
    icon: Grid,
    getHref: () => "/discover",
  },
  bookmarks: {
    key: "bookmarks",
    label: "Bookmarks",
    icon: Bookmark,
    getHref: () => "/bookmarks",
  },
  profile: {
    key: "profile",
    label: "Profile",
    icon: User,
    isProfile: true,
    getHref: ({ user }) => (user ? "/profile" : "/auth"),
    getActivePaths: () => ["/profile", "/auth"],
  },
}

const DEFAULT_ITEM_ORDER: MobileNavItemKey[] = ["home", "search", "discover", "bookmarks", "profile"]

function buildDisplayName(user: SupabaseUser | null, profile: Profile | null) {
  return (
    profile?.full_name?.trim() ||
    profile?.username?.trim() ||
    user?.email?.split("@")[0] ||
    ""
  )
}

function createInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part?.[0] || "")
    .join("")
    .toUpperCase()
    .substring(0, 2)
}

export function useMobileNavigation(options: UseMobileNavigationOptions = {}): UseMobileNavigationResult {
  const pathname = usePathname()
  const { user, profile, loading, isAuthenticated } = useAuth()
  const homeHref = getHomeHref(pathname)

  const displayName = buildDisplayName(user, profile)

  const items = (options.items ?? DEFAULT_ITEM_ORDER)
    .map((key) => {
      const definition = NAV_ITEM_DEFINITIONS[key]
      if (!definition) return null

      const override = options.itemOverrides?.[key]
      const href = override?.href ?? definition.getHref({ homeHref, user })
      const label = override?.label ?? definition.label
      const badge = override?.badge
      const hideWhenUnauthenticated =
        override?.hideWhenUnauthenticated ?? definition.hideWhenUnauthenticated ?? false
      const activePaths =
        override?.activePaths ?? definition.getActivePaths?.({ homeHref, user, href }) ?? [href]

      const isActive = activePaths.some((path) => path && pathname === path)

      const item: MobileNavItem = {
        key,
        href,
        label,
        icon: definition.icon,
        isProfile: definition.isProfile,
        hideWhenUnauthenticated,
        badge,
        activePaths,
        isActive,
      }

      return item
    })
    .filter((item): item is MobileNavItem => {
      if (!item) return false
      if (item.hideWhenUnauthenticated && !isAuthenticated) {
        return false
      }
      return true
    })

  return {
    items,
    pathname,
    isAuthenticated,
    user,
    profile,
    loading,
    displayName,
    getInitials: createInitials,
  }
}

export interface MobileNavBaseStyles {
  container?: string
  inner?: string
  item?: string
  itemActive?: string
  itemInactive?: string
  iconWrapper?: string
  activeIconWrapper?: string
  inactiveIconWrapper?: string
  icon?: string
  activeIcon?: string
  inactiveIcon?: string
  label?: string
  labelActive?: string
  labelInactive?: string
  badge?: string
  profileAvatar?: string
  profileAvatarFallback?: string
}

export interface MobileNavBaseProps extends UseMobileNavigationOptions {
  ariaLabel?: string
  styles?: MobileNavBaseStyles
  iconSize?: number
  showLabels?: boolean
  data?: UseMobileNavigationResult
}

const DEFAULT_STYLES: Required<Omit<MobileNavBaseStyles, "badge">> & { badge: string } = {
  container: "bg-white",
  inner: "flex items-center justify-around gap-2",
  item: "flex flex-col items-center justify-center",
  itemActive: "",
  itemInactive: "",
  iconWrapper: "relative flex items-center justify-center",
  activeIconWrapper: "",
  inactiveIconWrapper: "",
  icon: "",
  activeIcon: "",
  inactiveIcon: "",
  label: "text-xs",
  labelActive: "",
  labelInactive: "",
  badge: "absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 text-[10px] leading-tight flex items-center justify-center rounded-full bg-red-600 text-white",
  profileAvatar: "h-6 w-6",
  profileAvatarFallback: "bg-blue-600 text-white text-xs",
}

export function MobileNavBase({
  ariaLabel = "Mobile navigation",
  styles,
  iconSize = 20,
  showLabels = true,
  data,
  items,
  itemOverrides,
}: MobileNavBaseProps) {
  const navigationData = useMobileNavigation({ items, itemOverrides })
  const { items: resolvedItems, user, profile, loading, displayName, getInitials } = data ?? navigationData

  return (
    <nav className={cn(DEFAULT_STYLES.container, styles?.container)} aria-label={ariaLabel}>
      <div className={cn(DEFAULT_STYLES.inner, styles?.inner)}>
        {resolvedItems.map((item) => {
          const itemClassName = cn(
            DEFAULT_STYLES.item,
            styles?.item,
            item.isActive ? styles?.itemActive : styles?.itemInactive,
          )

          const iconWrapperClassName = cn(
            DEFAULT_STYLES.iconWrapper,
            styles?.iconWrapper,
            item.isActive ? styles?.activeIconWrapper : styles?.inactiveIconWrapper,
          )

          const iconClassName = cn(
            DEFAULT_STYLES.icon,
            styles?.icon,
            item.isActive ? styles?.activeIcon : styles?.inactiveIcon,
          )

          const labelClassName = cn(
            DEFAULT_STYLES.label,
            styles?.label,
            item.isActive ? styles?.labelActive : styles?.labelInactive,
          )

          const badgeClassName = cn(DEFAULT_STYLES.badge, styles?.badge)

          const profileAvatarClassName = cn(DEFAULT_STYLES.profileAvatar, styles?.profileAvatar)
          const profileAvatarFallbackClassName = cn(
            DEFAULT_STYLES.profileAvatarFallback,
            styles?.profileAvatarFallback,
          )

          const IconComponent = item.icon

          return (
            <Link key={item.key} href={item.href} className={itemClassName}>
              <div className={iconWrapperClassName}>
                {item.isProfile && user && !loading ? (
                  <Avatar className={profileAvatarClassName}>
                    <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                    <AvatarFallback className={profileAvatarFallbackClassName}>
                      {displayName ? getInitials(displayName) : "U"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <IconComponent size={iconSize} className={iconClassName} />
                )}
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className={badgeClassName}>{item.badge > 9 ? "9+" : item.badge}</span>
                )}
              </div>
              {showLabels && <span className={labelClassName}>{item.label}</span>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
