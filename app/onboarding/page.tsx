import { OnboardingClient } from "./OnboardingClient"

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Complete Your Profile - News On Africa",
  description: "Set up your News On Africa profile and preferences",
}

export default function OnboardingPage() {
  return <OnboardingClient />
}
