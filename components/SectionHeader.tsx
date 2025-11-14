import { cn } from "@/lib/utils"

export interface SectionHeaderProps {
  title: string
  subtitle?: string
  className?: string
}

export function SectionHeader({ title, subtitle, className }: SectionHeaderProps) {
  return (
    <header className={cn("mb-6", className)}>
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h2>
        {subtitle ? (
          <p className="text-sm text-muted-foreground md:text-base">{subtitle}</p>
        ) : null}
      </div>
      <div className="mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-primary via-primary/80 to-secondary" aria-hidden="true" />
    </header>
  )
}
