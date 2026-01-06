import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"
import Link from "next/link"

interface PaywallProps {
  reason?: string
  variant?: "article" | "feature"
}

export function Paywall({
  reason = "This content is available to subscribers only",
  variant = "article",
}: PaywallProps) {
  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <Lock className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle className="text-2xl">Subscriber Content</CardTitle>
        <CardDescription className="text-base">{reason}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="mb-6 text-sm text-muted-foreground">
          Get unlimited access to premium African news, investigative journalism, and in-depth analysis.
        </p>
        <ul className="mb-6 space-y-2 text-left text-sm">
          <li className="flex items-start gap-2">
            <span className="text-blue-600">✓</span>
            <span>All News On Africa content</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">✓</span>
            <span>Investigative journalism</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">✓</span>
            <span>Top opinion and in-depth analysis</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">✓</span>
            <span>Ad-free reading experience</span>
          </li>
        </ul>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button asChild className="w-full" size="lg">
          <Link href="/subscribe">Subscribe Now</Link>
        </Button>
        <Button asChild variant="outline" className="w-full bg-transparent">
          <Link href="/login">Sign In</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
