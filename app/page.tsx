import { getServerCountry } from "@/lib/utils/routing"
import { redirect } from "next/navigation"

export default function Home() {
  const country = getServerCountry()
  redirect(`/${country}`)
}
