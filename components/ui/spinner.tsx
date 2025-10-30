import type { ComponentProps } from 'react'

import { Loader2Icon } from 'lucide-react'

import { cn } from '@/lib/utils'

function Spinner({ className, ...props }: ComponentProps<'svg'>) {
  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground" role="status" aria-live="polite">
      <Loader2Icon className={cn('size-4', className)} aria-hidden="true" {...props} />
      <span className="text-xs font-medium uppercase tracking-wide">Loading</span>
    </span>
  )
}

export { Spinner }
