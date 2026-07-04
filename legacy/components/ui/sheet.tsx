"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

import { Slot } from "./slot"

interface SheetContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  titleId: string
  descriptionId: string
}

const SheetContext = React.createContext<SheetContextValue | null>(null)

function useSheetContext(component: string) {
  const context = React.useContext(SheetContext)
  if (!context) {
    throw new Error(`${component} must be used within <Sheet>`)
  }
  return context
}

interface SheetProps {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const Sheet = ({ children, open, defaultOpen, onOpenChange }: SheetProps) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false)
  const titleId = React.useId()
  const descriptionId = React.useId()

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

  const contextValue = React.useMemo<SheetContextValue>(
    () => ({ open: isOpen, setOpen, titleId, descriptionId }),
    [isOpen, setOpen, titleId, descriptionId],
  )

  return <SheetContext.Provider value={contextValue}>{children}</SheetContext.Provider>
}

Sheet.displayName = "Sheet"

const SheetTrigger = React.forwardRef<
  any,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild = false, onClick, className, ...props }, forwardedRef) => {
  const { open, setOpen } = useSheetContext("SheetTrigger")
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      {...props}
      ref={forwardedRef as React.Ref<any>}
      type={asChild ? undefined : "button"}
      className={className}
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={(event: React.MouseEvent<HTMLElement>) => {
        onClick?.(event as never)
        if (event.defaultPrevented) return
        setOpen(true)
      }}
    />
  )
})
SheetTrigger.displayName = "SheetTrigger"

const SheetClose = React.forwardRef<
  any,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild = false, onClick, className, ...props }, forwardedRef) => {
  const { setOpen } = useSheetContext("SheetClose")
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      {...props}
      ref={forwardedRef as React.Ref<any>}
      type={asChild ? undefined : "button"}
      className={className}
      onClick={(event: React.MouseEvent<HTMLElement>) => {
        onClick?.(event as never)
        if (event.defaultPrevented) return
        setOpen(false)
      }}
    />
  )
})
SheetClose.displayName = "SheetClose"

const SheetOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, onClick, ...props }, ref) => {
    const { open, setOpen } = useSheetContext("SheetOverlay")

    if (!open) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "fixed inset-0 z-50 bg-black/80 opacity-0 transition-opacity duration-150 ease-out data-[state=open]:opacity-100",
          className,
        )}
        data-state={open ? "open" : "closed"}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) {
            setOpen(false)
          }
        }}
        {...props}
      />
    )
  },
)
SheetOverlay.displayName = "SheetOverlay"

const sheetVariants = cva(
  "fixed z-50 bg-background p-6 shadow-lg transition-transform transition-opacity duration-300 ease-in-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b",
        bottom: "inset-x-0 bottom-0 border-t",
        left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
        right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
      },
      open: {
        true: "opacity-100",
        false: "opacity-0",
      },
    },
    defaultVariants: {
      side: "right",
      open: true,
    },
  },
)

interface SheetContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = "right", className, children, ...props }, forwardedRef) => {
    const { open, setOpen, titleId, descriptionId } = useSheetContext("SheetContent")
    const [mounted, setMounted] = React.useState(false)
    const portalNode = React.useMemo(() => (typeof document === "undefined" ? null : document.createElement("div")), [])

    React.useEffect(() => {
      if (!portalNode) return
      setMounted(true)
      document.body.appendChild(portalNode)
      return () => {
        document.body.removeChild(portalNode)
      }
    }, [portalNode])

    React.useEffect(() => {
      if (!open) return

      function handleEscape(event: KeyboardEvent) {
        if (event.key === "Escape") {
          setOpen(false)
        }
      }

      document.addEventListener("keydown", handleEscape)
      return () => document.removeEventListener("keydown", handleEscape)
    }, [open, setOpen])

    if (!portalNode || !mounted || !open) {
      return null
    }

    type SheetSide = "top" | "bottom" | "left" | "right"
    const translateClasses: Record<SheetSide, string> = {
      top: "data-[state=closed]:-translate-y-full data-[state=open]:translate-y-0",
      bottom: "data-[state=closed]:translate-y-full data-[state=open]:translate-y-0",
      left: "data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0",
      right: "data-[state=closed]:translate-x-full data-[state=open]:translate-x-0",
    }

    const resolvedSide: SheetSide = side ?? "right"

    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="fixed inset-0 z-50"
      >
        <SheetOverlay />
        <div
          ref={forwardedRef}
          data-state={open ? "open" : "closed"}
          className={cn(sheetVariants({ side, open }), translateClasses[resolvedSide], className)}
          {...props}
        >
          {children}
          <button
            type="button"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
      </div>,
      portalNode,
    )
  },
)
SheetContent.displayName = "SheetContent"

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    const { titleId } = useSheetContext("SheetTitle")
    return <h2 ref={ref} id={titleId} className={cn("text-lg font-semibold", className)} {...props} />
  },
)
SheetTitle.displayName = "SheetTitle"

const SheetDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { descriptionId } = useSheetContext("SheetDescription")
    return <p ref={ref} id={descriptionId} className={cn("text-sm text-muted-foreground", className)} {...props} />
  },
)
SheetDescription.displayName = "SheetDescription"

const SheetPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>
SheetPortal.displayName = "SheetPortal"

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
