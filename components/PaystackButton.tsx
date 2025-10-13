"use client"

import { useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Lock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PAYSTACK_PUBLIC_KEY } from "@/config/paystack"
import { generateTransactionReference, verifyPaystackTransaction } from "@/lib/paystack-utils"
import type { PaystackOptions, SubscriptionPlan } from "@/config/paystack"
import { useUser } from "@/contexts/UserContext"
import { recordSubscription } from "@/app/actions/subscriptions"
import { ActionError } from "@/lib/supabase/action-result"

interface PaystackButtonProps {
  email: string
  plan: SubscriptionPlan
  onSuccess?: (reference: string, response: any) => void
  onError?: (error: string) => void
  className?: string
  disabled?: boolean
  metadata?: Record<string, any>
  firstName?: string
  lastName?: string
  phone?: string
  label?: string
}

export function PaystackButton({
  email,
  plan,
  onSuccess,
  onError,
  className = "",
  disabled = false,
  metadata = {},
  firstName,
  lastName,
  phone,
  label = "Subscribe Now",
}: PaystackButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const { toast } = useToast()
  const { user } = useUser()
  const [, startTransition] = useTransition()

  // Load Paystack script
  useEffect(() => {
    // Check if the script is already loaded
    if (window.PaystackPop) {
      setScriptLoaded(true)
      return
    }

    // Load Paystack script
    const script = document.createElement("script")
    script.src = "https://js.paystack.co/v1/inline.js"
    script.async = true
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => {
      console.error("Failed to load Paystack script")
      toast({
        title: "Payment Error",
        description: "Failed to load payment gateway. Please try again later.",
        variant: "destructive",
      })
    }
    document.body.appendChild(script)

    return () => {
      // Clean up script if component unmounts
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

    if (!PAYSTACK_PUBLIC_KEY) {
      console.error("PAYSTACK_PUBLIC_KEY is not defined")
      toast({
        title: "Configuration Error",
        description: "Payment system is not properly configured. Please contact support.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const reference = generateTransactionReference()

      const metadataPayload: Record<string, any> = {
        plan_id: plan.id,
        plan_name: plan.name,
        paystack_plan_id: plan.paystackPlanId,
        ...metadata,
      }

      if (user?.id) {
        metadataPayload.user_id = user.id
      }

      if (firstName && !metadataPayload.first_name) {
        metadataPayload.first_name = firstName
      }

      if (lastName && !metadataPayload.last_name) {
        metadataPayload.last_name = lastName
      }

      if (!metadataPayload.subscriber_email) {
        metadataPayload.subscriber_email = email
      }

      const existingCustomFields = Array.isArray(metadataPayload.custom_fields)
        ? metadataPayload.custom_fields
        : []

      metadataPayload.custom_fields = [
        ...existingCustomFields.filter(
          (field: any) => field?.variable_name !== "plan" && field?.variable_name !== "interval",
        ),
        {
          display_name: "Plan",
          variable_name: "plan",
          value: plan.name,
        },
        {
          display_name: "Interval",
          variable_name: "interval",
          value: plan.interval,
        },
      ]

      const paystackOptions: PaystackOptions = {
        key: PAYSTACK_PUBLIC_KEY,
        email,
        amount: plan.amount,
        currency: plan.currency || "ZAR",
        ref: reference,
        plan: plan.paystackPlanId, // Use the Paystack plan ID
        label: plan.name,
        metadata: metadataPayload,
        onSuccess: async (response) => {
          try {
            console.log("Payment successful, verifying transaction...", response)
            // Verify the transaction on the server
            const verificationResult = await verifyPaystackTransaction(response.reference)

            if (verificationResult.status) {
              // Store subscription in Supabase
              const userId = verificationResult.data?.metadata?.user_id ?? user?.id

              if (userId) {
                const renewalDate = (() => {
                  const date = new Date()
                  switch (plan.interval) {
                    case "biannually":
                      date.setMonth(date.getMonth() + 6)
                      break
                    case "annually":
                      date.setFullYear(date.getFullYear() + 1)
                      break
                    default:
                      date.setMonth(date.getMonth() + 1)
                  }
                  return date.toISOString()
                })()

                startTransition(async () => {
                  try {
                    const recordResult = await recordSubscription({
                      userId,
                      plan: plan.name,
                      status: "active",
                      renewalDate,
                      paymentId: verificationResult.data.reference,
                      paymentProvider: "paystack",
                      metadata: verificationResult.data,
                    })

                    if (recordResult.error) {
                      throw recordResult.error
                    }
                  } catch (dbError: unknown) {
                    const message = dbError instanceof ActionError ? dbError.message : (dbError as Error)?.message
                    console.error("Error saving subscription:", message)
                  }
                })
              }

              toast({
                title: "Payment Successful",
                description: `Your ${plan.name} subscription has been activated.`,
              })

              if (onSuccess) {
                onSuccess(response.reference, verificationResult.data)
              }
            } else {
              throw new Error(verificationResult.message || "Transaction verification failed")
            }
          } catch (error) {
            console.error("Verification error:", error)
            toast({
              title: "Verification Error",
              description: "We received your payment, but there was an issue confirming it. Please contact support.",
              variant: "destructive",
            })

            if (onError) {
              onError("Verification failed")
            }
          } finally {
            // Always reset loading state
            setIsLoading(false)
          }
        },
        onCancel: () => {
          console.log("Payment cancelled by user")
          setIsLoading(false)
          toast({
            title: "Payment Cancelled",
            description: "You cancelled the payment process.",
          })
        },
      }

      // Add optional fields if provided
      if (firstName) paystackOptions.firstname = firstName
      if (lastName) paystackOptions.lastname = lastName
      if (phone) paystackOptions.phone = phone

      // Open Paystack payment modal
      const handler = window.PaystackPop.setup(paystackOptions)
      handler.openIframe()

      // Add a safety timeout to reset loading state if callbacks don't fire
      setTimeout(() => {
        if (isLoading) {
          console.log("Safety timeout triggered to reset loading state")
          setIsLoading(false)
        }
      }, 60000) // 1 minute timeout
    } catch (error) {
      console.error("Payment initialization error:", error)
      toast({
        title: "Payment Error",
        description: "There was an error initializing your payment. Please try again.",
        variant: "destructive",
      })

      if (onError) {
        onError("Payment initialization failed")
      }

      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || isLoading || !scriptLoaded}
      className={`w-full bg-blue-600 hover:bg-blue-700 text-white ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Lock className="mr-2 h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  )
}
