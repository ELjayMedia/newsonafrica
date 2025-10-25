"use client"

import * as React from "react"

import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

interface ToastContextValue {
  close: () => void
  open: boolean
  variant: NonNullable<ToastProps["variant"]>
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive: "border-destructive bg-destructive text-destructive-foreground",
      },
      open: {
        true: "opacity-100 translate-y-0",
        false: "pointer-events-none opacity-0 translate-y-2",
      },
    },
    defaultVariants: {
      variant: "default",
      open: true,
    },
  },
)

interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant = "default", open = true, onOpenChange, children, ...props }, ref) => {
    const handleClose = React.useCallback(() => {
      onOpenChange?.(false)
    }, [onOpenChange])

    const resolvedVariant: NonNullable<ToastProps["variant"]> = variant ?? "default"

    const contextValue = React.useMemo<ToastContextValue>(
      () => ({ close: handleClose, open, variant: resolvedVariant }),
      [handleClose, open, resolvedVariant],
    )

    if (!open && !className?.includes("data-state")) {
      // allow animation by keeping element briefly before removal via state management
    }

    return (
      <ToastContext.Provider value={contextValue}>
        <div
          ref={ref}
          role={resolvedVariant === "destructive" ? "alert" : "status"}
          className={cn(toastVariants({ variant: resolvedVariant, open }), className)}
          {...props}
        >
          {children}
        </div>
      </ToastContext.Provider>
    )
  },
)
Toast.displayName = "Toast"

const ToastTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
  ),
)
ToastTitle.displayName = "ToastTitle"

const ToastDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
  ),
)
ToastDescription.displayName = "ToastDescription"

const ToastAction = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
)
ToastAction.displayName = "ToastAction"

const ToastClose = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, onClick, ...props }, ref) => {
    const context = React.useContext(ToastContext)

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "absolute right-2 top-2 rounded-md p-1 text-foreground/60 transition-opacity hover:text-foreground focus:outline-none focus:ring-2",
          context?.variant === "destructive" && "text-red-200 hover:text-red-50 focus:ring-red-400",
          className,
        )}
        onClick={(event) => {
          onClick?.(event)
          if (event.defaultPrevented) return
          context?.close()
        }}
        {...props}
      >
        <span aria-hidden="true">×</span>
        <span className="sr-only">Close</span>
      </button>
    )
  },
)
ToastClose.displayName = "ToastClose"

const ToastViewport = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
        className,
      )}
      aria-live="polite"
      {...props}
    />
  ),
)
ToastViewport.displayName = "ToastViewport"

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>
ToastProvider.displayName = "ToastProvider"

type ToastActionElement = React.ReactElement<typeof ToastAction>

export { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose, ToastAction }
export type { ToastProps, ToastActionElement }
