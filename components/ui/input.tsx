"use client"

import * as React from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onSearch, onChange, ...props }, ref) => {
    const [inputValue, setInputValue] = useState(props.value || "")

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && onSearch) {
        e.preventDefault()
        onSearch(inputValue)
        setInputValue("")
      }
    }

    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-full border border-input bg-background px-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          "h-10 py-2 md:h-10 md:py-2", // Responsive height and padding
          "text-base md:text-sm", // Larger text on mobile, normal on desktop
          "touch-manipulation", // Better touch behavior
          className,
        )}
        ref={ref}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value)
          onChange?.(e)
        }}
        onKeyDown={handleKeyDown}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"

export { Input }
