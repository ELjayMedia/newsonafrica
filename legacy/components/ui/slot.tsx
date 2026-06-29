"use client"

import React from "react"

import { cn } from "@/lib/utils"

type SlotProps = Omit<React.HTMLAttributes<HTMLElement>, "children"> & {
  children?: React.ReactNode
}

function setRef(ref: React.Ref<unknown> | undefined, value: unknown) {
  if (!ref) return

  if (typeof ref === "function") {
    ref(value)
    return
  }

  if (typeof ref === "object") {
    ;(ref as React.MutableRefObject<unknown>).current = value
  }
}

export const Slot = React.forwardRef<any, SlotProps>(({ children, className, ...props }, forwardedRef) => {
  if (!React.isValidElement(children)) {
    return null
  }

  const child = children as React.ReactElement<any>
  const childRef = (child as unknown as { ref?: React.Ref<HTMLElement> }).ref
  const composedRef = (node: HTMLElement | null) => {
    setRef(forwardedRef, node)
    if (childRef) {
      setRef(childRef, node)
    }
  }

  const mergedProps = {
    ...child.props,
    ...props,
    className: cn((child.props as { className?: string }).className, className),
    ref: composedRef,
  } as Record<string, unknown>

  return React.cloneElement(child, mergedProps)
})

Slot.displayName = "Slot"
