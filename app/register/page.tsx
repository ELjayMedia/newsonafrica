import AuthPageClient from "@/app/auth/AuthPageClient"

type RegisterPageSearchParams = {
  redirectTo?: string
  error?: string
}

interface RegisterPageProps {
  searchParams?: RegisterPageSearchParams
}

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  return <AuthPageClient searchParams={searchParams} defaultView="sign_up" />
}
