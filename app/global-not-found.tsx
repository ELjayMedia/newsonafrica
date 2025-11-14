import NotFoundContent from "@/components/NotFoundContent"
import { AppLayout } from "@/components/layout/AppLayout"

export default function GlobalNotFound() {
  return (
    <html lang="en" className="font-sans">
      <head>
        <title>404 - Page Not Found | News On Africa</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-background font-sans antialiased">
        <AppLayout>
          <NotFoundContent />
        </AppLayout>
      </body>
    </html>
  )
}
