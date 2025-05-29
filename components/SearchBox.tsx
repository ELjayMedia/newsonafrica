"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Search, X } from "lucide-react"

interface SearchBoxProps {
  onSearch: (query: string) => void
  placeholder?: string
  initialValue?: string
  className?: string
  disabled?: boolean
}

export function SearchBox({
  onSearch,
  placeholder = "Search...",
  initialValue = "",
  className = "",
  disabled = false,
}: SearchBoxProps) {
  const [query, setQuery] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  // Handle input change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearch(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, onSearch])

  // Set initial value
  useEffect(() => {
    if (initialValue !== query) {
      setQuery(initialValue)
    }
  }, [initialValue])

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  // Clear search
  const handleClear = () => {
    setQuery("")
    onSearch("")
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="w-5 h-5 text-gray-400" aria-hidden="true" />
        </div>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full py-3 pl-10 pr-10 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
          placeholder={placeholder}
          disabled={disabled}
          aria-label="Search"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            aria-label="Clear search"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>
    </form>
  )
}
