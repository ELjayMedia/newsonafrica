import AuthPageClient from "./AuthPageClient"

export const metadata = {
  title: "Authentication - News On Africa",
  description: "Sign in or create an account on News On Africa",
}

export default function AuthPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string }
}) {
  return <AuthPageClient searchParams={searchParams} />
}
