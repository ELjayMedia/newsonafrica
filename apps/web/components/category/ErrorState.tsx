interface ErrorStateProps {
  message?: string
  retryHref?: string
}

export function ErrorState({ message = "We couldn't load this category right now.", retryHref = "/" }: ErrorStateProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-8 text-center">
      <h2 className="text-xl font-semibold text-destructive">Something went wrong</h2>
      <p className="text-sm text-destructive/80">{message}</p>
      <a
        href={retryHref}
        className="inline-flex items-center justify-center rounded-full bg-destructive px-6 py-2 text-sm font-medium text-destructive-foreground shadow transition hover:bg-destructive/90"
      >
        Try again
      </a>
    </div>
  )
}
