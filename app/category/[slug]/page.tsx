import { redirect } from "next/navigation"

const DEFAULT_COUNTRY = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY || "sz"

interface Props {
  params: { slug: string }
}

export default function CategoryRedirectPage({ params }: Props) {
  redirect(`/${DEFAULT_COUNTRY}/category/${params.slug}`)
}
