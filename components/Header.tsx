import { HydrationBoundary } from "@tanstack/react-query"
import { getServerCategories } from "@/lib/categories"
import HeaderClient from "./HeaderClient"

const DEFAULT_COUNTRY = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY || "sz"

export async function Header() {
  const codes = (process.env.NEXT_PUBLIC_SUPPORTED_COUNTRIES || DEFAULT_COUNTRY)
    .split(",")
    .filter(Boolean)
  const { categories, dehydratedState } = await getServerCategories(codes)

  return (
    <HydrationBoundary state={dehydratedState}>
      <HeaderClient categoriesByCountry={categories} />
    </HydrationBoundary>
  )
}

export default Header
