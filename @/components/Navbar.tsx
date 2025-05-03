"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function Navbar() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/search?query=${searchTerm}`)
  }

  return (
    <nav className="bg-primary text-primary-foreground p-4">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
        <Link href="/" className="text-2xl font-bold mb-4 sm:mb-0">
          News On Africa
        </Link>
        <form onSubmit={handleSearch} className="flex w-full sm:w-auto">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full sm:w-64 text-primary"
          />
          <Button type="submit" className="ml-2">
            Search
          </Button>
        </form>
      </div>
    </nav>
  )
}
