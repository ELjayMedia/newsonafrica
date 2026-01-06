import { Badge } from "@/components/ui/badge"
import { Crown } from "lucide-react"

interface SubscriptionBadgeProps {
  variant?: "default" | "outline"
  showIcon?: boolean
}

export function SubscriptionBadge({ variant = "default", showIcon = true }: SubscriptionBadgeProps) {
  return (
    <Badge variant={variant} className="bg-amber-500 text-white hover:bg-amber-600">
      {showIcon && <Crown className="mr-1 h-3 w-3" />}
      Premium
    </Badge>
  )
}
