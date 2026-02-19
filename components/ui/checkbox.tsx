"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type CheckedState = boolean | "indeterminate"

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "checked"> {
  checked?: CheckedState
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, defaultChecked, onCheckedChange, ...props }, ref) => {
    const isControlled = checked !== undefined
    const [internal, setInternal] = React.useState<boolean>(!!defaultChecked)

    const resolvedChecked =
      checked === "indeterminate" ? false : isControlled ? !!checked : internal

    return (
      <input
        {...props}
        ref={ref}
        type="checkbox"
        className={cn(
          "h-4 w-4 rounded border border-input bg-background text-primary",
          className,
        )}
        checked={resolvedChecked}
        onChange={(e) => {
          const next = e.target.checked
          if (!isControlled) setInternal(next)
          onCheckedChange?.(next)
        }}
      />
    )
  },
)

Checkbox.displayName = "Checkbox"
