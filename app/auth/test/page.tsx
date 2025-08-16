import { OAuthTest } from "@/components/OAuthTest"

export const metadata = {
  title: "OAuth Test - News on Africa",
  description: "Test the OAuth login flow",
}

export default function OAuthTestPage() {
  return (
    <div className="container mx-auto max-w-md py-8 px-4">
      <h1 className="text-2xl font-bold text-center mb-6">OAuth Login Test</h1>
      <OAuthTest />
    </div>
  )
}
