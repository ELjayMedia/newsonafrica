import { Suspense } from "react"
import SendMagicLinkButton from "@/components/auth/SendMagicLinkButton"

export default async function SignInPage(): Promise<JSX.Element> {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <Suspense fallback={<p>Loading authentication UI…</p>}>
        <SendMagicLinkButton />
      </Suspense>
    </section>
  )
}
