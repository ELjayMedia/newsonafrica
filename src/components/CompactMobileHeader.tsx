"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export function CompactMobileHeader() {
  const router = useRouter()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      router.push(`/search?query=${encodeURIComponent(searchTerm.trim())}`)
      setIsSearchOpen(false)
      setSearchTerm("")
    }
  }

  return <>{/* Mobile header removed as requested */}</>
}
