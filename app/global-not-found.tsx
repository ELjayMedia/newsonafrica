import NotFoundContent from "@/components/NotFoundContent"
import { AppShell } from "@/components/AppShell"

export default function GlobalNotFound() {
  return (
    <html lang="en" className="font-sans">
      <head>
        <title>404 - Page Not Found | News On Africa</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AppShell>
          <NotFoundContent />
        </AppShell>
      </body>
    </html>
  )
}
