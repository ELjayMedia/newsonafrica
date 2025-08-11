import type React from "react"
import { designTokens, componentStyles, combineTokens } from "./design-tokens"

type SidebarWidgetProps = {
  title: string
  className?: string
  children: React.ReactNode
}

export function SidebarWidget({ title, className, children }: SidebarWidgetProps) {
  return (
    <section className={combineTokens(componentStyles.sidebarWidget, className || "")}>
      <header className={designTokens.spacing.padding.md}>
        <h3
          className={combineTokens(
            designTokens.typography.special.uppercase,
            designTokens.colors.text.primary,
            "text-center",
          )}
        >
          {title}
        </h3>
        <div className="mx-auto mt-1 h-0.5 w-16 bg-blue-600" aria-hidden="true" />
      </header>
      <div className={designTokens.spacing.padding.md}>{children}</div>
    </section>
  )
}

export default SidebarWidget
