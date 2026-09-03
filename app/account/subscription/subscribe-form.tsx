"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

const PLANS = [
  {
    id: "monthly",
    name: "Monthly",
    price: "$9.99",
    period: "month",
    features: ["Unlimited articles", "Weekly intelligence briefings", "Ad-free reading", "Newsletter access"],
  },
  {
    id: "annual",
    name: "Annual",
    price: "$79.99",
    period: "year",
    popular: true,
    features: ["Everything in Monthly", "Brand intelligence reports", "Competitor tracking", "Priority support", "Save 33%"],
  },
];

export function SubscribeForm() {
  const [selectedPlan, setSelectedPlan] = useState("annual");
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    // TODO: Call create-paystack-session edge function (NOA-144)
    // const res = await fetch("/api/create-paystack-session", { method: "POST", body: JSON.stringify({ plan: selectedPlan }) });
    // const { authorization_url } = await res.json();
    // window.location.href = authorization_url;
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="heading-lg">Subscribe to News On Africa</h1>
        <p className="body-sm mt-1 text-muted-foreground">
          Get unlimited access to independent African journalism and intelligence.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`cursor-pointer transition-shadow ${selectedPlan === plan.id ? "ring-2 ring-primary" : ""}`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {plan.popular && (
                  <span className="rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">Popular</span>
                )}
              </div>
              <CardDescription>
                <span className="text-2xl font-bold text-foreground">{plan.price}</span>/{plan.period}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={handleSubscribe} disabled={loading} className="w-full sm:w-auto">
        {loading ? "Processing..." : "Subscribe now"}
      </Button>
    </div>
  );
}
