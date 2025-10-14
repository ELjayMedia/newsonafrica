import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SidebarSectionCardProps extends HTMLAttributes<HTMLElement> {
  as?: keyof HTMLElementTagNameMap
}

export function SidebarSectionCard({
  as: Component = "section",
  className,
  children,
  ...rest
}: PropsWithChildren<SidebarSectionCardProps>) {
  return (
    <Component
      className={cn("bg-white shadow-sm rounded-lg border border-gray-100", className)}
      {...rest}
    >
      {children}
    </Component>
  )
}

interface SidebarSectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode
  title?: string
  children?: ReactNode
}

export function SidebarSectionHeader({
  icon,
  title,
  className,
  children,
  ...rest
}: SidebarSectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 mb-5 pb-3 border-b-2 border-gray-200",
        className,
      )}
      {...rest}
    >
      {icon}
      {title ? (
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      ) : (
        children
      )}
    </div>
  )
}
