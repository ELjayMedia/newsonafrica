import AuthPageClient from "./AuthPageClient"

export const metadata = {
  title: "Sign In - News on Africa",
  description: "Sign in or create an account to access personalized features on News on Africa",
}

export default function AuthPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string; error?: string }
}) {
  return <AuthPageClient searchParams={searchParams} />
}
