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
    <header className={cn("mb-6", className)}>
      <div className="flex flex-col gap-2">
        <Heading level="h2" weight="bold">{title}</Heading>
        {subtitle ? (
          <Text size="sm" color="muted">{subtitle}</Text>
        ) : null}
      </div>
      <div className="mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-primary via-primary/80 to-secondary" aria-hidden="true" />
    </header>
  )
}
