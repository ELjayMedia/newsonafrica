import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getUserSubscriptions } from "@/app/actions/subscriptions"
import { ActionError } from "@/lib/supabase/action-result"

type Subscription = Awaited<ReturnType<typeof getUserSubscriptions>> extends {
  data: infer T
}
  ? NonNullable<T>[number]
  : never

export async function SubscriptionsContent({ userId }: { userId: string }) {
  const result = await getUserSubscriptions(userId)

  if (result.error) {
    const message = result.error instanceof ActionError ? result.error.message : "Failed to load subscriptions"

    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load subscriptions</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild>
            <a href="/subscribe">View Subscription Plans</a>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const subscriptions = result.data ?? []

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
      {subscriptions.map((subscription: Subscription) => (
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
