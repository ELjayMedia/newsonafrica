import { AppLayout } from "@/components/layout/AppLayout"
import { GlobalErrorContent } from "@/components/GlobalErrorContent"

export default function GlobalError({
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <html lang="en" className="font-sans">
      <body className="bg-background font-sans antialiased">
        <AppLayout>
          <GlobalErrorContent reset={reset} />
        </AppLayout>
      </body>
    </html>
  )
}
