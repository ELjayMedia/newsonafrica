"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

import { Slot } from "./slot"

interface DropdownMenuContextValue {
  open: boolean
  setOpen: (next: boolean) => void
  triggerRef: React.MutableRefObject<HTMLElement | null>
  contentRef: React.MutableRefObject<HTMLDivElement | null>
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null)

function useDropdownMenuContext(component: string) {
  const context = React.useContext(DropdownMenuContext)
  if (!context) {
    throw new Error(`${component} must be used within <DropdownMenu>`)
  }
  return context
}

interface DropdownMenuProps {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

function DropdownMenu({ children, open, defaultOpen, onOpenChange, className }: DropdownMenuProps) {
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

  const value = React.useMemo<DropdownMenuContextValue>(
    () => ({ open: isOpen, setOpen, triggerRef, contentRef }),
    [isOpen, setOpen],
  )

  return (
    <DropdownMenuContext.Provider value={value}>
      <div className={cn("relative inline-flex", className)}>{children}</div>
    </DropdownMenuContext.Provider>
  )
}

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

interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const DropdownMenuTrigger = React.forwardRef<any, DropdownMenuTriggerProps>(
  ({ asChild = false, className, disabled, onClick, ...props }, forwardedRef) => {
    const { open, setOpen, triggerRef } = useDropdownMenuContext("DropdownMenuTrigger")
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
        aria-haspopup="menu"
        aria-expanded={open}
        data-state={open ? "open" : "closed"}
        disabled={disabled}
        onClick={(event: React.MouseEvent<HTMLElement>) => {
          onClick?.(event as never)
          if (event.defaultPrevented || disabled) return
          setOpen(!open)
        }}
      />
    )
  },
)
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end" | "center"
  sideOffset?: number
}

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, align = "start", sideOffset = 8, style, children, ...props }, forwardedRef) => {
    const { open, contentRef } = useDropdownMenuContext("DropdownMenuContent")
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
        role="menu"
        style={{ marginTop: sideOffset, ...style }}
        className={cn(
          "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg focus:outline-none",
          alignmentClasses[align],
          "top-full",
          className,
        )}
      >
        {children}
      </div>
    )
  },
)
DropdownMenuContent.displayName = "DropdownMenuContent"

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  inset?: boolean
  asChild?: boolean
}

const DropdownMenuItem = React.forwardRef<any, DropdownMenuItemProps>(
  ({ className, inset, asChild = false, onClick, disabled, ...props }, forwardedRef) => {
    const { setOpen } = useDropdownMenuContext("DropdownMenuItem")
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        {...props}
        ref={forwardedRef as React.Ref<any>}
        role="menuitem"
        type={asChild ? undefined : "button"}
        data-disabled={disabled ? "true" : undefined}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
          inset && "pl-8",
          className,
        )}
        onClick={(event: React.MouseEvent<HTMLElement>) => {
          onClick?.(event as never)
          if (event.defaultPrevented || disabled) return
          setOpen(false)
        }}
      />
    )
  },
)
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }>(
  ({ className, inset, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
      {...props}
    />
  ),
)
DropdownMenuLabel.displayName = "DropdownMenuLabel"

const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />,
)
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

const DropdownMenuGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("grid gap-1", className)} {...props} />,
)
DropdownMenuGroup.displayName = "DropdownMenuGroup"

const DropdownMenuPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>
DropdownMenuPortal.displayName = "DropdownMenuPortal"

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />
)
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

const DropdownMenuCheckboxItem = React.forwardRef<HTMLElement, DropdownMenuItemProps & { checked?: boolean }>(
  ({ children, checked = false, className, ...props }, ref) => (
    <DropdownMenuItem
      ref={ref}
      className={cn("pl-8", className)}
      aria-checked={checked}
      role="menuitemcheckbox"
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <span className={cn("h-2 w-2 rounded-sm", checked ? "bg-current" : "border")}></span>
      </span>
      {children}
    </DropdownMenuItem>
  ),
)
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem"

const DropdownMenuRadioGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} role="radiogroup" className={className} {...props} />,
)
DropdownMenuRadioGroup.displayName = "DropdownMenuRadioGroup"

const DropdownMenuRadioItem = React.forwardRef<HTMLElement, DropdownMenuItemProps & { checked?: boolean }>(
  ({ children, checked = false, className, ...props }, ref) => (
    <DropdownMenuItem
      ref={ref}
      className={cn("pl-8", className)}
      aria-checked={checked}
      role="menuitemradio"
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <span className={cn("h-2 w-2 rounded-full", checked ? "bg-current" : "border")}></span>
      </span>
      {children}
    </DropdownMenuItem>
  ),
)
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem"

const DropdownMenuSub: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>
DropdownMenuSub.displayName = "DropdownMenuSub"

const DropdownMenuSubTrigger = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }>(
  ({ className, inset, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent",
        inset && "pl-8",
        className,
      )}
      {...props}
    />
  ),
)
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger"

const DropdownMenuSubContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "absolute left-full top-0 z-50 min-w-[8rem] translate-x-2 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg",
        className,
      )}
      {...props}
    />
  ),
)
DropdownMenuSubContent.displayName = "DropdownMenuSubContent"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}

export const DropdownMenuFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("border-t border-border px-3 py-2 text-xs text-muted-foreground", className)} {...props} />
  ),
)
DropdownMenuFooter.displayName = "DropdownMenuFooter"
