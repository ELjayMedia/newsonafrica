"use client"

import React, { createContext, useContext } from "react"
import type { NavItem } from "@/config/nav"

interface NavContextValue {
  items: NavItem[]
}

const NavContext = createContext<NavContextValue>({ items: [] })

export function NavProvider({ items, children }: { items: NavItem[]; children: React.ReactNode }) {
  return <NavContext.Provider value={{ items }}>{children}</NavContext.Provider>
}

export function useNav() {
  return useContext(NavContext)
}

