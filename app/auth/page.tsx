import AuthPageClient from "./AuthPageClient"

export const metadata = {
  title: "Sign In - News On Africa",
  description: "Sign in or create an account to access personalized features on News On Africa",
}

export default function AuthPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string; error?: string }
}) {
  return <AuthPageClient searchParams={searchParams} />
}
