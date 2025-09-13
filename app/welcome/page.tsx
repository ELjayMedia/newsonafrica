import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

export const metadata = {
  title: "Subscription Confirmed - News On Africa",
  description: "Your subscription to News On Africa has been successfully activated",
}

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to News On Africa!</h1>

        <p className="text-gray-600 mb-6">
          Your subscription has been successfully activated. Thank you for supporting quality journalism across Africa.
        </p>

        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h2 className="font-semibold text-blue-800 mb-2">What's Next?</h2>
          <ul className="text-sm text-blue-700 text-left space-y-2">
            <li>• Enjoy unlimited access to all articles</li>
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
