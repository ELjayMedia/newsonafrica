"use client"
import { MostRead } from "./most-read"
import { designTokens } from "./ui/design-tokens"

/**
 * SidebarContent
 * - Centralized sidebar layout using standardized widgets
 * - Mobile-first: renders full width on small screens, becomes a sidebar on lg+
 */
export function SidebarContent() {
  return (
    <aside className={designTokens.spacing.gap.xl}>
      <MostRead />
      {/* Additional sidebar widgets can be added here in the same standardized pattern */}
    </aside>
  )
}

export default SidebarContent
