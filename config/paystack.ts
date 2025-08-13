export interface PaystackOptions {
  publicKey: string;
  secretKey?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface SubscriptionPlan {
  id: string;
  paystackPlanId: string;
  name: string;
  amount: number;
  interval: 'monthly' | 'biannually' | 'annually';
  description: string;
  currency: string;
  features: string[];
  trial?: string;
  isPopular?: boolean;
  savePercentage?: number;
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: Record<string, any>;
    log: {
      start_time: number;
      time_spent: number;
      attempts: number;
      errors: number;
      success: boolean;
      mobile: boolean;
      input: any[];
      history: Array<{
        type: string;
        message: string;
        time: number;
      }>;
    };
    fees: number;
    fees_split: any;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string | null;
    };
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: Record<string, any>;
      risk_action: string;
      international_format_phone: string | null;
    };
    plan: {
      id: number;
      name: string;
      plan_code: string;
      description: string | null;
      amount: number;
      interval: string;
      send_invoices: boolean;
      send_sms: boolean;
      currency: string;
    } | null;
    split: Record<string, any>;
    order_id: string | null;
    paidAt: string;
    createdAt: string;
    requested_amount: number;
    pos_transaction_data: any;
    source: any;
    fees_breakdown: any;
  };
}

export const PAYSTACK_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'monthly',
    paystackPlanId: 'PLN_puhcond3yermojx', // Updated plan code for Monthly
    name: 'Monthly',
    amount: 8900, // R89 in cents
    interval: 'monthly',
    description: 'Billed monthly, cancel anytime',
    currency: 'ZAR',
    features: [
      'All News On Africa content',
      'Investigative journalism',
      'Top opinion and in-depth analysis',
      'Ad-free reading experience',
      'Early access to special features',
    ],
    trial: '14 days free',
  },
  {
    id: 'biannually',
    paystackPlanId: 'PLN_sr9a6kz9mq8wt0n', // Updated plan code for 6 Months
    name: '6 Months',
    amount: 45000, // R450 in cents
    interval: 'biannually',
    description: 'Billed every 6 months',
    currency: 'ZAR',
    features: [
      'All News On Africa content',
      'Investigative journalism',
      'Top opinion and in-depth analysis',
      'Ad-free reading experience',
      'Early access to special features',
      'Priority customer support',
    ],
    isPopular: true,
    savePercentage: 16,
  },
  {
    id: 'annually',
    paystackPlanId: 'PLN_eojot8m0qq5k81a', // Updated plan code for Annual
    name: 'Annual',
    amount: 85000, // R850 in cents
    interval: 'annually',
    description: 'Best value, billed annually',
    currency: 'ZAR',
    features: [
      'All News On Africa content',
      'Investigative journalism',
      'Top opinion and in-depth analysis',
      'Ad-free reading experience',
      'Early access to special features',
      'Priority customer support',
      'Exclusive annual subscriber events',
    ],
    savePercentage: 20,
  },
];

export const DEFAULT_PAYSTACK_OPTIONS: PaystackOptions = {
  publicKey: PAYSTACK_PUBLIC_KEY,
  baseUrl: 'https://api.paystack.co',
  timeout: 30000,
  retries: 3,
};

export function getSubscriptionPlan(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
}

export function formatAmount(amount: number, currency = 'ZAR'): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

export function calculateSavings(planId: string): { amount: number; percentage: number } | null {
  const plan = getSubscriptionPlan(planId);
  if (!plan || !plan.savePercentage) return null;

  const monthlyPlan = getSubscriptionPlan('monthly');
  if (!monthlyPlan) return null;

  const monthsInPlan = plan.interval === 'annually' ? 12 : 6;
  const regularPrice = monthlyPlan.amount * monthsInPlan;
  const discountedPrice = plan.amount;
  const savings = regularPrice - discountedPrice;

  return {
    amount: savings,
    percentage: plan.savePercentage,
  };
}
