import { createContext, useContext, useState, type ReactNode } from "react"

interface NavigationContextValue {
  activeSlug: string | null
  setActiveSlug: (slug: string | null) => void
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  return (
    <NavigationContext.Provider value={{ activeSlug, setActiveSlug }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigationState() {
  const context = useContext(NavigationContext)
  if (!context) {
    return { activeSlug: null, setActiveSlug: () => {} }
  }
  return context
}
