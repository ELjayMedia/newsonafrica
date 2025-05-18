"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface PricingFeature {
  text: string
  included: boolean
}

interface PricingCardProps {
  title: string
  price: string
  duration: string
  description: string
  isPopular?: boolean
  savings?: string
  features?: PricingFeature[]
  buttonText?: string
  onButtonClick?: () => void
  className?: string
}

export function PricingCard({
  title,
  price,
  duration,
  description,
  isPopular,
  savings,
  features = [],
  buttonText = "Subscribe",
  onButtonClick,
  className,
}: PricingCardProps) {
  return (
    <Card
      className={cn(
        "relative flex flex-col justify-between transition-shadow hover:shadow-lg h-full",
        isPopular && "border-2 border-blue-600 shadow-md",
        className,
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-semibold px-3 py-1 rounded-full text-center">
          MOST POPULAR
        </div>
      )}
      <CardHeader className="text-center pt-6">
        {savings && <div className="text-blue-600 text-sm font-semibold mb-2">SAVE {savings}</div>}
        <h3 className="font-semibold text-lg">{title}</h3>
      </CardHeader>
      <CardContent className="text-center flex-grow">
        <div className="flex items-baseline justify-center gap-1 mb-4">
          <span className="text-3xl font-bold">R{price}</span>
          <span className="text-sm text-gray-500">/{duration}</span>
        </div>
        <p className="text-sm text-gray-600 mb-6">{description}</p>

        {features.length > 0 && (
          <ul className="space-y-3 text-left mt-6">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <span className={`mr-2 mt-1 ${feature.included ? "text-green-500" : "text-gray-400"}`}>
                  <Check className="h-4 w-4" />
                </span>
                <span className={feature.included ? "text-gray-700" : "text-gray-400"}>{feature.text}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter className="pb-6 pt-2 flex justify-center">
        <Button onClick={onButtonClick} className={cn("w-full", isPopular ? "bg-blue-600 hover:bg-blue-700" : "")}>
          {buttonText}
        </Button>
      </CardFooter>
    </Card>
  )
}
