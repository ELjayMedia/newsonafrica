import { cn } from "@/lib/utils"
import { Heading } from "@/components/ui/Heading"
import { Text } from "@/components/ui/Text"

export interface SectionHeaderProps {
  title: string
  subtitle?: string
  className?: string
}

export function SectionHeader({ title, subtitle, className }: SectionHeaderProps) {
  return (
    <header className={cn("mb-4", className)}>
      <div className="flex flex-col gap-1.5">
        {/* Bold Punch — heavy uppercase section title */}
        <Heading level="h2" weight="bold" className="font-display font-extrabold uppercase tracking-tight">
          {title}
        </Heading>
        {subtitle ? (
          <Text size="sm" color="muted">{subtitle}</Text>
        ) : null}
      </div>
      <div className="mt-3 h-1.5 w-14 rounded-full bg-primary" aria-hidden="true" />
    </header>
  )
}
