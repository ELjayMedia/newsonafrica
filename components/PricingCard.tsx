import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface PricingCardProps {
  title: string
  price: string
  duration: string
  description: string
  isPopular?: boolean
  savings?: string
  className?: string
}

export function PricingCard({ title, price, duration, description, isPopular, savings, className }: PricingCardProps) {
  return (
    <Card
      className={cn(
        "relative flex flex-col justify-between transition-shadow hover:shadow-lg",
        isPopular && "border-2 border-blue-600",
        className,
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-semibold px-3 py-1 rounded-full text-center">
          MOST POPULAR
        </div>
      )}
      <CardHeader className="text-center pt-6">
        {savings && <div className="text-blue-600 text-sm font-semibold mb-2">SAVE {savings}</div>}
        <h3 className="font-semibold text-lg">{title}</h3>
      </CardHeader>
      <CardContent className="text-center">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-bold">R{price}</span>
        </div>
        <p className="text-sm text-gray-600 mt-2">{description}</p>
      </CardContent>
      <CardFooter className="pb-6" />
    </Card>
  )
}
