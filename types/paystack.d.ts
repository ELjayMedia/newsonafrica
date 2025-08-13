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
    [key: string]: any;
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
    metadata: any;
    log: any;
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
      metadata: any;
      risk_action: string;
      international_format_phone: string | null;
    };
    plan: any;
    subaccount: any;
    split: any;
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
