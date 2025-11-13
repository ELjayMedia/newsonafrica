import { AppShell } from "@/components/AppShell"
import { GlobalErrorContent } from "@/components/GlobalErrorContent"

export default function GlobalError({
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <html lang="en" className="font-sans">
      <body className="min-h-screen bg-background font-sans antialiased">
        <AppShell>
          <GlobalErrorContent reset={reset} />
        </AppShell>
      </body>
    </html>
  )
}
