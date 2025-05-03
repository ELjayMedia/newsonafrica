"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchFormProps {
  initialQuery?: string
}

export function SearchForm({ initialQuery = "" }: SearchFormProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState(initialQuery)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      router.push(`/search?query=${encodeURIComponent(searchTerm.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
      <Input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search..."
        className="flex-grow"
      />
      <Button type="submit" variant="primary">
        Search
      </Button>
    </form>
  )
}
