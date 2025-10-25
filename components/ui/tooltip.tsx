"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

import { Slot } from "./slot"

interface TooltipContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.MutableRefObject<HTMLElement | null>
  delayDuration: number
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null)

function useTooltipContext(component: string) {
  const context = React.useContext(TooltipContext)
  if (!context) {
    throw new Error(`${component} must be used within <Tooltip>`)
  }
  return context
}

interface TooltipProps {
  children: React.ReactNode
  delayDuration?: number
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const Tooltip = ({ children, delayDuration = 150, open, defaultOpen, onOpenChange }: TooltipProps) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false)
  const triggerRef = React.useRef<HTMLElement | null>(null)

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

  const value = React.useMemo<TooltipContextValue>(
    () => ({ open: isOpen, setOpen, triggerRef, delayDuration }),
    [isOpen, setOpen, delayDuration],
  )

  return <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>
}

Tooltip.displayName = "Tooltip"

interface TooltipTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean
}

const TooltipTrigger = React.forwardRef<any, TooltipTriggerProps>(
  ({ asChild = false, onFocus, onBlur, onMouseEnter, onMouseLeave, className, ...props }, forwardedRef) => {
    const { setOpen, triggerRef, delayDuration } = useTooltipContext("TooltipTrigger")
    const Comp = asChild ? Slot : "button"
    const timeoutRef = React.useRef<number | undefined>(undefined)

    const handleOpen = () => {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(() => setOpen(true), delayDuration)
    }

    const handleClose = () => {
      window.clearTimeout(timeoutRef.current)
      setOpen(false)
    }

    return (
      <Comp
        {...props}
        ref={(node: HTMLElement | null) => {
          if (typeof forwardedRef === "function") {
            forwardedRef(node)
          } else if (forwardedRef && typeof forwardedRef === "object") {
            ;(forwardedRef as React.MutableRefObject<HTMLElement | null>).current = node
          }
          triggerRef.current = node
        }}
        className={className}
        onFocus={(event) => {
          onFocus?.(event)
          handleOpen()
        }}
        onBlur={(event) => {
          onBlur?.(event)
          handleClose()
        }}
        onMouseEnter={(event) => {
          onMouseEnter?.(event)
          handleOpen()
        }}
        onMouseLeave={(event) => {
          onMouseLeave?.(event)
          handleClose()
        }}
      />
    )
  },
)
TooltipTrigger.displayName = "TooltipTrigger"

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  sideOffset?: number
  align?: "start" | "center" | "end"
  side?: "top" | "bottom" | "left" | "right"
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, children, sideOffset = 8, align = "center", side = "top", style, ...props }, forwardedRef) => {
    const { open, triggerRef } = useTooltipContext("TooltipContent")
    const [position, setPosition] = React.useState<{
      top: number
      left: number
      transform: string
    } | null>(null)

    React.useEffect(() => {
      if (!open || !triggerRef.current) {
        return
      }

      const rect = triggerRef.current.getBoundingClientRect()
      const scrollX = window.scrollX
      const scrollY = window.scrollY

      let top = rect.top + scrollY
      let left = rect.left + scrollX
      let transform = "translate(-50%, -100%)"

      if (side === "top") {
        top = rect.top + scrollY - sideOffset
        if (align === "start") {
          left = rect.left + scrollX
          transform = "translateY(-100%)"
        } else if (align === "end") {
          left = rect.left + rect.width + scrollX
          transform = "translate(-100%, -100%)"
        } else {
          left = rect.left + rect.width / 2 + scrollX
          transform = "translate(-50%, -100%)"
        }
      } else if (side === "bottom") {
        top = rect.bottom + scrollY + sideOffset
        if (align === "start") {
          left = rect.left + scrollX
          transform = "translateY(0)"
        } else if (align === "end") {
          left = rect.left + rect.width + scrollX
          transform = "translate(-100%, 0)"
        } else {
          left = rect.left + rect.width / 2 + scrollX
          transform = "translate(-50%, 0)"
        }
      } else if (side === "left") {
        left = rect.left + scrollX - sideOffset
        if (align === "start") {
          top = rect.top + scrollY
          transform = "translate(-100%, 0)"
        } else if (align === "end") {
          top = rect.bottom + scrollY
          transform = "translate(-100%, -100%)"
        } else {
          top = rect.top + rect.height / 2 + scrollY
          transform = "translate(-100%, -50%)"
        }
      } else if (side === "right") {
        left = rect.right + scrollX + sideOffset
        if (align === "start") {
          top = rect.top + scrollY
          transform = "translate(0, 0)"
        } else if (align === "end") {
          top = rect.bottom + scrollY
          transform = "translate(0, -100%)"
        } else {
          top = rect.top + rect.height / 2 + scrollY
          transform = "translate(0, -50%)"
        }
      }

      setPosition({ top, left, transform })
    }, [align, open, side, sideOffset, triggerRef])

    const portalNode = React.useMemo(() => (typeof document === "undefined" ? null : document.createElement("div")), [])

    React.useEffect(() => {
      if (!portalNode) return
      document.body.appendChild(portalNode)
      return () => {
        document.body.removeChild(portalNode)
      }
    }, [portalNode])

    if (!open || !position || !portalNode) {
      return null
    }

    return createPortal(
      <div
        {...props}
        ref={forwardedRef}
        role="tooltip"
        style={{
          position: "absolute",
          top: position.top,
          left: position.left,
          transform: position.transform,
          ...style,
        }}
        className={cn(
          "z-50 max-w-xs rounded-md bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
          className,
        )}
      >
        {children}
      </div>,
      portalNode,
    )
  },
)
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent }
