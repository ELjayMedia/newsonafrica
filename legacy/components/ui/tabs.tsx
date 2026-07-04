"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string | null
  selectValue: (value: string) => void
  getTriggerId: (value: string) => string
  getContentId: (value: string) => string
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

interface TabsProps {
  children: React.ReactNode
  className?: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

const Tabs = ({ children, className, value, defaultValue, onValueChange }: TabsProps) => {
  const [internalValue, setInternalValue] = React.useState<string | null>(defaultValue ?? null)
  const id = React.useId()

  const currentValue = value ?? internalValue

  const selectValue = React.useCallback(
    (next: string) => {
      if (value === undefined) {
        setInternalValue(next)
      }
      onValueChange?.(next)
    },
    [onValueChange, value],
  )

  const getTriggerId = React.useCallback((triggerValue: string) => `${id}-trigger-${triggerValue}`, [id])
  const getContentId = React.useCallback((contentValue: string) => `${id}-content-${contentValue}`, [id])

  const contextValue = React.useMemo<TabsContextValue>(
    () => ({ value: currentValue ?? null, selectValue, getTriggerId, getContentId }),
    [currentValue, selectValue, getTriggerId, getContentId],
  )

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "pills" | "underline"; size?: "sm" | "default" | "lg" }
>(({ className, variant = "default", size = "default", ...props }, ref) => {
  const variantClasses = {
    default: "inline-flex items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
    pills: "inline-flex items-center justify-center rounded-full bg-muted p-1 text-muted-foreground",
    underline: "inline-flex items-center justify-center border-b bg-transparent text-muted-foreground",
  }

  const sizeClasses = {
    sm: "h-8",
    default: "h-10",
    lg: "h-12",
  }

  return (
    <div ref={ref} role="tablist" className={cn(variantClasses[variant], sizeClasses[size], className)} {...props} />
  )
})
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "pills" | "underline"; size?: "sm" | "default" | "lg"; value: string }
>(({ className, variant = "default", size = "default", value: triggerValue, ...props }, ref) => {
  const context = React.useContext(TabsContext)

  if (!context) {
    throw new Error("TabsTrigger must be used within <Tabs>")
  }

  const { value, selectValue, getContentId, getTriggerId } = context
  const isActive = value === triggerValue

  const variantClasses = {
    default:
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    pills:
      "inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    underline:
      "inline-flex items-center justify-center whitespace-nowrap px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  }

  const activeClasses = {
    default: "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
    pills: "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
    underline: "data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground",
  }

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    default: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  }

  return (
    <button
      ref={ref}
      role="tab"
      id={getTriggerId(triggerValue)}
      type="button"
      aria-controls={getContentId(triggerValue)}
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      className={cn(variantClasses[variant], activeClasses[variant], sizeClasses[size], className)}
      onClick={(event) => {
        props.onClick?.(event)
        if (!event.defaultPrevented) {
          selectValue(triggerValue)
        }
      }}
      {...props}
    />
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string }>(
  ({ className, value: contentValue, hidden, ...props }, ref) => {
    const context = React.useContext(TabsContext)

    if (!context) {
      throw new Error("TabsContent must be used within <Tabs>")
    }

    const { value, getContentId, getTriggerId } = context
    const isActive = value === contentValue

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={getContentId(contentValue)}
        aria-labelledby={getTriggerId(contentValue)}
        data-state={isActive ? "active" : "inactive"}
        hidden={hidden ?? !isActive}
        className={cn(
          "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          !isActive && "hidden",
          className,
        )}
        {...props}
      />
    )
  },
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
