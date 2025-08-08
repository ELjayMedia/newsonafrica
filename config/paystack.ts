export const PAYSTACK_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

export const SUBSCRIPTION_PLANS = [
  {
    id: "monthly",
    paystackPlanId: "PLN_puhcond3yermojx", // Updated plan code for Monthly
    name: "Monthly",
    amount: 8900, // R89 in cents
    interval: "monthly",
    description: "Billed monthly, cancel anytime",
    currency: "ZAR",
    features: [
      "All News On Africa content",
      "Investigative journalism",
      "Top opinion and in-depth analysis",
      "Ad-free reading experience",
      "Early access to special features",
    ],
    trial: "14 days free",
  },
  {
    id: "biannually",
    paystackPlanId: "PLN_sr9a6kz9mq8wt0n", // Updated plan code for 6 Months
    name: "6 Months",
    amount: 45000, // R450 in cents
    interval: "biannually",
    description: "Billed every 6 months",
    currency: "ZAR",
    features: [
      "All News On Africa content",
      "Investigative journalism",
      "Top opinion and in-depth analysis",
      "Ad-free reading experience",
      "Early access to special features",
      "Priority customer support",
    ],
    isPopular: true,
    savePercentage: 16,
  },
  {
    id: "annually",
    paystackPlanId: "PLN_eojot8m0qq5k81a", // Updated plan code for Annual
    name: "Annual",
    amount: 85000, // R850 in cents
    interval: "annually",
    description: "Best value, billed annually",
    currency: "ZAR",
    features: [
      "All News On Africa content",
      "Investigative journalism",
      "Top opinion and in-depth analysis",
      "Ad-free reading experience",
      "Early access to special features",
      "Priority customer support",
      "Exclusive annual subscriber events",
    ],
    savePercentage: 20,
  },
]
