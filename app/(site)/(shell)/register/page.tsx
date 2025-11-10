import RegisterForm from "./RegisterForm"

type RegisterPageSearchParams = {
  redirectTo?: string
}

interface RegisterPageProps {
  searchParams?: RegisterPageSearchParams
}

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  return <RegisterForm redirectTo={searchParams?.redirectTo} />
}
