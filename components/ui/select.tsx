"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Slot } from "./slot"

type SelectContextValue<T extends string> = {
  value: T | undefined
  setValue: (value: T) => void
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.MutableRefObject<HTMLElement | null>
  selectedLabel: React.ReactNode
  setSelectedLabel: (label: React.ReactNode) => void
}

// Context can't be truly generic, so we store "any" and cast at usage points.
const SelectContext = React.createContext<SelectContextValue<any> | null>(null)

function useSelectContext<T extends string>(component: string) {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error(`${component} must be used within <Select>`)
  }
  return context as SelectContextValue<T>
}

export interface SelectProps<T extends string = string> {
  children: React.ReactNode
  value?: T
  defaultValue?: T
  onValueChange?: (value: T) => void
}

const Select = <T extends string = string,>({
  children,
  value,
  defaultValue,
  onValueChange,
}: SelectProps<T>) => {
  const [internalValue, setInternalValue] = React.useState<T | undefined>(defaultValue)
  const [selectedLabel, setSelectedLabel] = React.useState<React.ReactNode>(null)
  const [open, setOpenState] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement | null>(null)

  const currentValue = value !== undefined ? value : internalValue

  const setValue = React.useCallback(
    (next: T) => {
      if (value === undefined) {
        setInternalValue(next)
      }
      onValueChange?.(next)
    },
    [onValueChange, value],
  )

  const setOpen = React.useCallback((next: boolean) => {
    setOpenState(next)
  }, [])

  const contextValue = React.useMemo<SelectContextValue<T>>(
    () => ({
      value: currentValue,
      setValue,
      open,
      setOpen,
      triggerRef,
      selectedLabel,
      setSelectedLabel,
    }),
    [currentValue, setValue, open, setOpen, selectedLabel],
  )

  return (
    <SelectContext.Provider value={contextValue}>
      <div className="relative inline-flex w-full flex-col">{children}</div>
    </SelectContext.Provider>
  )
}

Select.displayName = "Select"

const SelectTrigger = React.forwardRef<
  any,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, asChild = false, onClick, children, ...props }, forwardedRef) => {
  const { open, setOpen, triggerRef, selectedLabel } = useSelectContext<string>("SelectTrigger")
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      {...props}
      ref={(node: HTMLElement | null) => {
        if (typeof forwardedRef === "function") {
          forwardedRef(node)
        } else if (forwardedRef && typeof forwardedRef === "object") {
          ; (forwardedRef as React.MutableRefObject<HTMLElement | null>).current = node
        }
        triggerRef.current = node
      }}
      type={asChild ? undefined : "button"}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      aria-haspopup="listbox"
      aria-expanded={open}
      data-state={open ? "open" : "closed"}
      onClick={(event: React.MouseEvent<HTMLElement>) => {
        onClick?.(event as never)
        if (event.defaultPrevented) return
        setOpen(!open)
      }}
    >
      {children ?? <span className="line-clamp-1">{selectedLabel}</span>}
      {!asChild && <span className="ml-2 inline-flex h-4 w-4 items-center justify-center text-muted-foreground">▾</span>}
    </Comp>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, style, ...props }, forwardedRef) => {
    const { open, setOpen, triggerRef } = useSelectContext<string>("SelectContent")
    const contentRef = React.useRef<HTMLDivElement | null>(null)

    React.useImperativeHandle(forwardedRef, () => contentRef.current as HTMLDivElement)

    React.useEffect(() => {
      if (!open) return

      function handlePointerDown(event: MouseEvent) {
        const target = event.target as Node | null
        if (!target) return
        if (contentRef.current?.contains(target)) return
        if (triggerRef.current?.contains(target as Node)) return
        setOpen(false)
      }

      function handleEscape(event: KeyboardEvent) {
        if (event.key === "Escape") setOpen(false)
      }

      document.addEventListener("pointerdown", handlePointerDown)
      document.addEventListener("keydown", handleEscape)

      return () => {
        document.removeEventListener("pointerdown", handlePointerDown)
        document.removeEventListener("keydown", handleEscape)
      }
    }, [open, setOpen, triggerRef])

    if (!open) return null

    const triggerWidth = triggerRef.current?.offsetWidth

    return (
      <div
        {...props}
        ref={contentRef}
        role="listbox"
        style={{ marginTop: 8, width: triggerWidth, ...style }}
        className={cn(
          "absolute left-0 z-50 max-h-60 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
          className,
        )}
      >
        {children}
      </div>
    )
  },
)
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, children, onClick, ...props }, forwardedRef) => {
  const { value: selectedValue, setValue, setOpen, setSelectedLabel } = useSelectContext<string>("SelectItem")
  const isActive = selectedValue === value

  return (
    <button
      {...props}
      ref={forwardedRef}
      type="button"
      role="option"
      data-state={isActive ? "active" : "inactive"}
      aria-selected={isActive}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent text-accent-foreground",
        className,
      )}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        setValue(value)
        setSelectedLabel(children)
        setOpen(false)
      }}
    >
      {isActive && <span className="mr-2">✓</span>}
      <span className="flex-1 text-left">{children}</span>
    </button>
  )
})
SelectItem.displayName = "SelectItem"

const SelectValue = ({ placeholder, className }: { placeholder?: React.ReactNode; className?: string }) => {
  const { selectedLabel, value } = useSelectContext<string>("SelectValue")
  return <span className={cn("line-clamp-1", className)}>{value ? selectedLabel : placeholder}</span>
}
SelectValue.displayName = "SelectValue"

const SelectGroup = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1", className)} {...props} />
)
SelectGroup.displayName = "SelectGroup"

const SelectLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-2 py-1.5 text-sm font-semibold", className)} {...props} />
  ),
)
SelectLabel.displayName = "SelectLabel"

const SelectSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />,
)
SelectSeparator.displayName = "SelectSeparator"

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, SelectGroup, SelectLabel, SelectSeparator }
