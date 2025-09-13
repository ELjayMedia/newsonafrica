import logger from '@/utils/logger'
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"

type Subscription = {
  id: string
  status: string
  plan: string
  renewal_date: string | null
  created_at: string
}

export function SubscriptionsContent({ userId }: { userId: string }) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

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
            <CardTitle>{subscription.plan}</CardTitle>
            <CardDescription>
              Status: <span className="font-medium capitalize">{subscription.status}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Started:</span> {new Date(subscription.created_at).toLocaleDateString()}
              </p>
              {subscription.renewal_date && (
                <p className="text-sm">
                  <span className="font-medium">Renews:</span>{" "}
                  {new Date(subscription.renewal_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
