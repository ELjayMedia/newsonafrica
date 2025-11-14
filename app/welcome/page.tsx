import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

export const metadata = {
  title: "Subscription Confirmed - News On Africa",
  description: "Your subscription to News On Africa has been successfully activated",
}

export default function WelcomePage() {
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-md">
        <div className="mb-4 flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-900">Welcome to News On Africa!</h1>

        <p className="mb-6 text-gray-600">
          Your subscription has been successfully activated. Thank you for supporting quality journalism across Africa.
        </p>

        <div className="mb-6 rounded-lg bg-blue-50 p-4">
          <h2 className="mb-2 font-semibold text-blue-800">What's Next?</h2>
          <ul className="space-y-2 text-left text-sm text-blue-700">
            <li>• Enjoy unlimited access to all articles</li>
            <li>• Bookmark articles to read later</li>
            <li>• Receive our weekly newsletter</li>
            <li>• Join the conversation in article comments</li>
          </ul>
        </div>

        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/">Start Reading</Link>
          </Button>

          <Button asChild variant="outline" className="w-full">
            <Link href="/profile">Manage Your Subscription</Link>
          </Button>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>
            We've sent a confirmation email with your subscription details. If you have any questions, please{" "}
            <Link href="/contact" className="text-blue-600 hover:underline">
              contact us
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
