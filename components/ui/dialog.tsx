"use client"

import * as React from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

import { Slot } from "./slot"

interface DialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  titleId: string
  descriptionId: string
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext(component: string) {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error(`${component} must be used within <Dialog>`)
  }
  return context
}

interface DialogProps {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const Dialog = ({ children, open, defaultOpen, onOpenChange }: DialogProps) => {
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

  const contextValue = React.useMemo<DialogContextValue>(
    () => ({ open: isOpen, setOpen, titleId, descriptionId }),
    [isOpen, setOpen, titleId, descriptionId],
  )

  return <DialogContext.Provider value={contextValue}>{children}</DialogContext.Provider>
}

Dialog.displayName = "Dialog"

const DialogTrigger = React.forwardRef<
  any,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild = false, onClick, className, ...props }, forwardedRef) => {
  const { open, setOpen } = useDialogContext("DialogTrigger")
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      {...props}
      ref={forwardedRef as React.Ref<any>}
      type={asChild ? undefined : "button"}
      aria-haspopup="dialog"
      aria-expanded={open}
      data-state={open ? "open" : "closed"}
      className={className}
      onClick={(event: React.MouseEvent<HTMLElement>) => {
        onClick?.(event as never)
        if (event.defaultPrevented) return
        setOpen(true)
      }}
    />
  )
})
DialogTrigger.displayName = "DialogTrigger"

const DialogClose = React.forwardRef<
  any,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ asChild = false, onClick, className, ...props }, forwardedRef) => {
  const { setOpen } = useDialogContext("DialogClose")
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
DialogClose.displayName = "DialogClose"

const DialogOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { open } = useDialogContext("DialogOverlay")

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
        {...props}
      />
    )
  },
)
DialogOverlay.displayName = "DialogOverlay"

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { showCloseButton?: boolean }
>(({ className, children, showCloseButton = true, ...props }, forwardedRef) => {
    const { open, setOpen, titleId, descriptionId } = useDialogContext("DialogContent")
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

    const content = (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        <DialogOverlay onClick={() => setOpen(false)} />
        <div
          ref={forwardedRef}
          className={cn(
            "relative z-10 w-full max-w-lg scale-95 rounded-lg border bg-background p-6 opacity-0 shadow-lg transition-transform transition-opacity duration-200 ease-out data-[state=open]:scale-100 data-[state=open]:opacity-100",
            className,
          )}
          data-state={open ? "open" : "closed"}
          {...props}
        >
          {showCloseButton ? (
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {children}
        </div>
      </div>
    )

    return createPortal(content, portalNode)
  },
)
DialogContent.displayName = "DialogContent"

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    const { titleId } = useDialogContext("DialogTitle")
    return (
      <h2
        ref={ref}
        id={titleId}
        className={cn("text-lg font-semibold leading-none tracking-tight", className)}
        {...props}
      />
    )
  },
)
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { descriptionId } = useDialogContext("DialogDescription")
    return (
      <p ref={ref} id={descriptionId} className={cn("text-sm text-muted-foreground", className)} {...props} />
    )
  },
)
DialogDescription.displayName = "DialogDescription"

const DialogPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>
DialogPortal.displayName = "DialogPortal"

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
