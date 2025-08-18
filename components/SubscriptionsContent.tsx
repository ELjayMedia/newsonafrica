import logger from "@/utils/logger";
"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"

type Subscription = {
  id: string
  status: string
  plan_name: string
  current_period_end: string
  created_at: string
}

export function SubscriptionsContent({ userId }: { userId: string }) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function loadSubscriptions() {
      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })

        if (error) throw error
        setSubscriptions(data || [])
      } catch (error) {
        logger.error("Error loading subscriptions:", error)
        toast({
          title: "Error",
          description: "Failed to load subscription data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadSubscriptions()
  }, [userId, supabase])

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      setLoading(true)
      const response = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscriptionId }),
      })

      if (!response.ok) {
        throw new Error("Failed to cancel subscription")
      }

      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled successfully.",
      })

      // Refresh subscriptions
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setSubscriptions(data || [])
    } catch (error) {
      logger.error("Error cancelling subscription:", error)
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse h-96 bg-gray-100 rounded-md"></div>
  }

  if (subscriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Subscriptions</CardTitle>
          <CardDescription>
            You don't have any active subscriptions. Subscribe to get premium access to News On Africa.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild>
            <a href="/subscribe">View Subscription Plans</a>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {subscriptions.map((subscription) => (
        <Card key={subscription.id}>
          <CardHeader>
            <CardTitle>{subscription.plan_name}</CardTitle>
            <CardDescription>
              Status: <span className="font-medium capitalize">{subscription.status}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Started:</span> {new Date(subscription.created_at).toLocaleDateString()}
              </p>
              {subscription.current_period_end && (
                <p className="text-sm">
                  <span className="font-medium">Renews:</span>{" "}
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            {subscription.status === "active" && (
              <Button variant="outline" onClick={() => handleCancelSubscription(subscription.id)} disabled={loading}>
                Cancel Subscription
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
