interface EmptyStateProps {
  message?: string
}

export function EmptyState({ message = "No articles available for this category yet." }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/40 p-12 text-center">
      <h2 className="text-xl font-semibold text-foreground">Nothing to see here (yet)</h2>
      <p className="max-w-xl text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
