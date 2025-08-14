declare global {
  interface Window {
    PaystackPop: {
      setup(options: PaystackOptions): {
        openIframe(): void;
      };
    };
  }
}

export interface PaystackOptions {
  key: string;
  email: string;
  amount: number; // in kobo or cents (x100)
  currency?: string;
  ref?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  label?: string;
  metadata?: {
    custom_fields?: Array<{
      display_name: string;
      variable_name: string;
      value: string;
    }>;
    [key: string]: unknown;
  };
  plan?: string;
  quantity?: number;
  channels?: string[];
  subaccount?: string;
  transaction_charge?: number;
  bearer?: string;
  onSuccess(response: PaystackSuccessResponse): void;
  onCancel?(): void;
  callback?(response: PaystackSuccessResponse): void;
}

export interface PaystackSuccessResponse {
  reference: string;
  trans: string;
  status: string;
  message: string;
  transaction: string;
  trxref: string;
  redirecturl?: string;
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: unknown;
    log: unknown;
    fees: number;
    fees_split: unknown;
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
      metadata: unknown;
      risk_action: string;
      international_format_phone: string | null;
    };
    plan: unknown;
    subaccount: unknown;
    split: unknown;
    order_id: string | null;
    paidAt: string;
    requested_amount: number;
    transaction_date: string;
  };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  amount: number;
  interval: 'monthly' | 'quarterly' | 'biannually' | 'annually';
  description?: string;
  currency?: string;
  features?: string[];
  isPopular?: boolean;
  savePercentage?: number;
  trial?: string;
}

export interface PaystackMetadata {
  user_id?: string;
  type?: string;
  plan_id?: string;
  plan_name?: string;
  interval?: string;
  description?: string;
  article_id?: string;
  recipient_email?: string;
}

export interface PaystackCustomer {
  customer_code?: string;
  metadata?: PaystackMetadata;
}

export interface PaystackPlanDetails {
  plan_code?: string;
  name?: string;
}

export interface ChargeSuccessPayload {
  reference: string;
  amount: number;
  currency?: string;
  status: string;
  metadata?: PaystackMetadata;
  customer?: PaystackCustomer;
}

export interface SubscriptionCreatePayload {
  subscription_code: string;
  customer?: PaystackCustomer;
  plan?: PaystackPlanDetails;
  status?: string;
  next_payment_date?: string;
}

export interface SubscriptionDisablePayload {
  subscription_code: string;
  customer?: PaystackCustomer;
}

export interface InvoicePaymentFailedPayload {
  reference: string;
  amount: number;
  currency?: string;
  metadata?: PaystackMetadata;
}

export interface InvoiceUpdatePayload {
  invoice_code: string;
  status?: string;
  next_payment_date?: string;
  subscription?: {
    customer?: PaystackCustomer;
  };
}

export interface TransferSuccessPayload {
  reference: string;
}

export interface TransferFailedPayload {
  reference: string;
}

export type PaystackWebhookEvent =
  | { event: 'charge.success'; data: ChargeSuccessPayload }
  | { event: 'subscription.create'; data: SubscriptionCreatePayload }
  | { event: 'subscription.disable'; data: SubscriptionDisablePayload }
  | { event: 'invoice.payment_failed'; data: InvoicePaymentFailedPayload }
  | { event: 'invoice.update'; data: InvoiceUpdatePayload }
  | { event: 'transfer.success'; data: TransferSuccessPayload }
  | { event: 'transfer.failed'; data: TransferFailedPayload };
