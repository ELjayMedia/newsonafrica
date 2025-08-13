import AuthPageClient from "./AuthPageClient"

export const metadata = {
  title: "Sign In - News on Africa",
  description: "Sign in or create an account to access personalized features on News on Africa",
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>
}) {
  const params = await searchParams
  return <AuthPageClient searchParams={params} />
}
