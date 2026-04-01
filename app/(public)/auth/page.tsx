import AuthPageClient from "./AuthPageClient"

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Sign In - News on Africa",
  description: "Sign in or create an account to access personalized features on News on Africa",
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; returnTo?: string; error?: string }>
}) {
  const resolvedParams = await searchParams
  return <AuthPageClient searchParams={resolvedParams} />
}
