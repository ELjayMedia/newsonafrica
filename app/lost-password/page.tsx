import ClientLostPasswordPage from "./client-page"

// Disable static generation for this page
export const dynamic = "force-dynamic"

export default function LostPasswordPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ClientLostPasswordPage />
    </div>
  )
}
