"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Gift, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  generateTransactionReference,
  verifyPaystackTransaction,
} from "@/lib/paystack-utils"
import { PAYSTACK_PUBLIC_KEY } from "@/config/paystack"
import type { PaystackOptions } from "@/types/paystack"

interface GiftArticleButtonProps {
  articleTitle: string
  className?: string
}

export function GiftArticleButton({
  articleTitle,
  className = "",
}: GiftArticleButtonProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Load Paystack script
  useEffect(() => {
    if (window.PaystackPop) {
      setScriptLoaded(true)
      return
    }

    const script = document.createElement("script")
    script.src = "https://js.paystack.co/v1/inline.js"
    script.async = true
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => {
      toast({
        title: "Payment Error",
        description: "Failed to load payment gateway. Please try again later.",
        variant: "destructive",
      })
    }
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [toast])

  const handlePayment = async () => {
    if (!scriptLoaded) {
      toast({
        title: "Payment Error",
        description: "Payment system is still initializing. Please try again in a moment.",
        variant: "destructive",
      })
      return
    }

    const email = window.prompt("Enter your email address") || ""
    if (!email) return

    const amountInput = window.prompt("Enter amount in ZAR") || ""
    const amount = Math.round(Number(amountInput) * 100)
    if (!amount || isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid donation amount.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    const reference = generateTransactionReference()
    const paystackOptions: PaystackOptions = {
      key: PAYSTACK_PUBLIC_KEY,
      email,
      amount,
      currency: "ZAR",
      ref: reference,
      label: articleTitle,
      metadata: {
        article_title: articleTitle,
        custom_fields: [
          {
            display_name: "Article",
            variable_name: "article",
            value: articleTitle,
          },
        ],
      },
      onSuccess: async (response) => {
        try {
          const verification = await verifyPaystackTransaction(response.reference)
          if (verification.status) {
            toast({
              title: "Thank you!",
              description: "Your donation was successful.",
            })
          } else {
            toast({
              title: "Verification Failed",
              description: verification.message,
              variant: "destructive",
            })
          }
        } catch (error) {
          toast({
            title: "Verification Error",
            description: "We received your payment, but could not verify it.",
            variant: "destructive",
          })
        } finally {
          setIsLoading(false)
        }
      },
      onCancel: () => {
        setIsLoading(false)
        toast({
          title: "Payment Cancelled",
          description: "You cancelled the donation process.",
        })
      },
    }

    const handler = window.PaystackPop.setup(paystackOptions)
    handler.openIframe()
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={!scriptLoaded || isLoading}
      variant="outline"
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
          <span className="ml-1">Processing...</span>
        </>
      ) : (
        <>
          <Gift className="w-3 h-3 md:w-4 md:h-4" />
          <span className="hidden sm:inline">Gift article</span>
        </>
      )}
    </Button>
  )
}
