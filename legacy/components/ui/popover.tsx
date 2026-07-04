"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

import { Slot } from "./slot"

interface PopoverContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.MutableRefObject<HTMLElement | null>
  contentRef: React.MutableRefObject<HTMLDivElement | null>
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null)

function usePopoverContext(component: string) {
  const context = React.useContext(PopoverContext)
  if (!context) {
    throw new Error(`${component} must be used within <Popover>`)
  }
  return context
}

interface PopoverProps {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

const Popover = ({ children, open, defaultOpen, onOpenChange, className }: PopoverProps) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false)
  const triggerRef = React.useRef<HTMLElement | null>(null)
  const contentRef = React.useRef<HTMLDivElement | null>(null)

  const isOpen = open ?? internalOpen

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (open === undefined) {
        setInternalOpen(next)
      }
      onOpenChange?.(next)
    },
    [onOpenChange, open],
  )

  React.useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null
      if (!target) return

      if (
        contentRef.current &&
        (contentRef.current === target || contentRef.current.contains(target))
      ) {
        return
      }

      if (triggerRef.current && (triggerRef.current === target || triggerRef.current.contains(target))) {
        return
      }

      setOpen(false)
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen, setOpen])

  const value = React.useMemo<PopoverContextValue>(
    () => ({ open: isOpen, setOpen, triggerRef, contentRef }),
    [isOpen, setOpen],
  )

  return (
    <PopoverContext.Provider value={value}>
      <div className={cn("relative inline-flex", className)}>{children}</div>
    </PopoverContext.Provider>
  )
}

Popover.displayName = "Popover"

function useMergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return React.useCallback(
    (node: T | null) => {
      for (const ref of refs) {
        if (!ref) continue
        if (typeof ref === "function") {
          ref(node)
        } else {
          ;(ref as React.MutableRefObject<T | null>).current = node
        }
      }
    },
    [refs],
  )
}

interface PopoverTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const PopoverTrigger = React.forwardRef<any, PopoverTriggerProps>(
  ({ asChild = false, className, onClick, ...props }, forwardedRef) => {
    const { open, setOpen, triggerRef } = usePopoverContext("PopoverTrigger")
    const Comp = asChild ? Slot : "button"
    const mergedRef = useMergeRefs<HTMLElement>(forwardedRef, (node) => {
      triggerRef.current = node
    })

    return (
      <Comp
        {...props}
        ref={mergedRef as React.Ref<any>}
        className={className}
        type={asChild ? undefined : "button"}
        aria-expanded={open}
        aria-haspopup="dialog"
        data-state={open ? "open" : "closed"}
        onClick={(event: React.MouseEvent<HTMLElement>) => {
          onClick?.(event as never)
          if (event.defaultPrevented) return
          setOpen(!open)
        }}
      />
    )
  },
)
PopoverTrigger.displayName = "PopoverTrigger"

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end" | "center"
  sideOffset?: number
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, align = "center", sideOffset = 8, style, children, ...props }, forwardedRef) => {
    const { open, contentRef } = usePopoverContext("PopoverContent")
    const mergedRef = useMergeRefs<HTMLDivElement>(forwardedRef, (node) => {
      contentRef.current = node
    })

    if (!open) {
      return null
    }

    const alignmentClasses = {
      start: "left-0",
      end: "right-0",
      center: "left-1/2 -translate-x-1/2",
    }

    return (
      <div
        {...props}
        ref={mergedRef}
        style={{ marginTop: sideOffset, ...style }}
        className={cn(
          "absolute top-full z-50 min-w-[12rem] rounded-md border bg-popover p-4 text-popover-foreground shadow-lg focus:outline-none",
          alignmentClasses[align],
          className,
        )}
      >
        {children}
      </div>
    )
  },
)
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent }
