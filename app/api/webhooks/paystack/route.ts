import crypto from 'crypto';

import { NextResponse } from 'next/server';

import { startWebhookTunnel } from '@/lib/paystack-utils';
import { createAdminClient } from '@/lib/supabase';
import type {
  PaystackWebhookEvent,
  ChargeSuccessPayload,
  SubscriptionCreatePayload,
  SubscriptionDisablePayload,
  InvoicePaymentFailedPayload,
  InvoiceUpdatePayload,
  TransferSuccessPayload,
  TransferFailedPayload,
} from '@/types/paystack';

export const runtime = 'nodejs';

function calculateEndDate(interval?: string) {
  const end = new Date();
  switch (interval) {
    case 'annually':
      end.setFullYear(end.getFullYear() + 1);
      break;
    case 'biannually':
      end.setMonth(end.getMonth() + 6);
      break;
    default:
      end.setMonth(end.getMonth() + 1);
  }
  return end.toISOString();
}

// Start webhook tunnel in development
if (process.env.NODE_ENV === 'development') {
  startWebhookTunnel();
}

export async function POST(request: Request) {
  try {
    // Get the signature from the headers
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      console.error('No Paystack signature provided');
      return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
    }

    // Get the request body as text
    const body = await request.text();

    // Verify the signature
    const secretKey = process.env.PAYSTACK_SECRET_KEY || '';
    const hash = crypto.createHmac('sha512', secretKey).update(body).digest('hex');

    if (hash !== signature) {
      console.error('Invalid Paystack signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse the body
    const event = JSON.parse(body) as PaystackWebhookEvent;
    console.log(`Received Paystack webhook: ${event.event}`);

    // Log webhook event
    try {
      const admin = createAdminClient();
      await admin.from('webhook_events').insert({
        event_type: event.event,
        payload: event,
        received_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to log Paystack webhook:', err);
    }

    // Handle different event types
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;

      case 'subscription.create':
        await handleSubscriptionCreated(event.data);
        break;

      case 'subscription.disable':
        await handleSubscriptionDisabled(event.data);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data);
        break;

      case 'invoice.update':
        await handleInvoiceUpdate(event.data);
        break;

      case 'transfer.success':
        await handleTransferSuccess(event.data);
        break;

      case 'transfer.failed':
        await handleTransferFailed(event.data);
        break;

      default:
        console.log(`Unhandled Paystack event: ${event.event}`, event.data);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Event handlers
async function handleChargeSuccess(data: ChargeSuccessPayload) {
  console.log('Processing successful charge:', data.reference);
  try {
    const admin = createAdminClient();
    const metadata = data.metadata ?? {};
    const userId = metadata.user_id;
    const type = metadata.type ?? 'subscription';

    let subscriptionId: string | null = null;
    if (type === 'subscription' && userId) {
      const { data: sub } = await admin
        .from('subscriptions')
        .upsert(
          {
            user_id: userId,
            paystack_customer_id: data.customer?.customer_code || null,
            plan: metadata.plan_id || metadata.plan_name || 'plan',
            status: 'active',
            current_period_end: calculateEndDate(metadata.interval),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
        .select('id')
        .single();
      subscriptionId = sub?.id ?? null;
    } else if (type === 'gift') {
      await admin.from('article_gifts').insert({
        user_id: userId ?? null,
        article_id: metadata.article_id,
        recipient_email: metadata.recipient_email,
        reference: data.reference,
        amount: data.amount,
        currency: data.currency || 'NGN',
        status: data.status,
      });
    }

    await admin.from('payments').insert({
      subscription_id: subscriptionId,
      reference: data.reference,
      amount: data.amount,
      currency: data.currency || 'NGN',
      status: data.status,
      description: metadata.description || null,
    });
  } catch (error) {
    console.error('Error processing charge.success webhook:', error);
  }
}

async function handleSubscriptionCreated(data: SubscriptionCreatePayload) {
  console.log('Processing subscription creation:', data.subscription_code);
  try {
    const admin = createAdminClient();
    const metadata = data.customer?.metadata ?? {};
    const userId = metadata.user_id;

    await admin.from('subscriptions').upsert(
      {
        user_id: userId ?? null,
        paystack_customer_id: data.customer?.customer_code ?? null,
        plan: data.plan?.plan_code || data.plan?.name || 'plan',
        status: data.status ?? 'active',
        current_period_end: data.next_payment_date
          ? new Date(data.next_payment_date).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  } catch (error) {
    console.error('Error storing subscription from webhook:', error);
  }
}

async function handleSubscriptionDisabled(data: SubscriptionDisablePayload) {
  console.log('Processing subscription cancellation:', data.subscription_code);
  try {
    const admin = createAdminClient();
    await admin
      .from('subscriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('paystack_customer_id', data.customer?.customer_code ?? '');
  } catch (error) {
    console.error('Error cancelling subscription:', error);
  }
}

async function handlePaymentFailed(data: InvoicePaymentFailedPayload) {
  console.log('Processing failed payment:', data.reference);
  try {
    const admin = createAdminClient();
    const metadata = data.metadata ?? {};
    const userId = metadata.user_id;
    let subscriptionId: string | null = null;
    if (userId) {
      const { data: sub } = await admin
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      subscriptionId = sub?.id ?? null;
    }

    await admin.from('payments').insert({
      subscription_id: subscriptionId,
      reference: data.reference,
      amount: data.amount,
      currency: data.currency ?? 'NGN',
      status: 'failed',
      description: metadata.description ?? null,
    });
  } catch (error) {
    console.error('Error storing failed payment:', error);
  }
}

async function handleInvoiceUpdate(data: InvoiceUpdatePayload) {
  console.log('Processing invoice update:', data.invoice_code);
  try {
    const admin = createAdminClient();
    if (data.status === 'success' && data.subscription?.customer?.customer_code) {
      await admin
        .from('subscriptions')
        .update({
          current_period_end: data.next_payment_date
            ? new Date(data.next_payment_date).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('paystack_customer_id', data.subscription.customer.customer_code);
    }
  } catch (error) {
    console.error('Error processing invoice update:', error);
  }
}

async function handleTransferSuccess(data: TransferSuccessPayload) {
  console.log('Processing successful transfer:', data.reference);
  try {
    const admin = createAdminClient();

    // Check if we've already processed this transfer
    const { data: payment } = await admin
      .from('payments')
      .select('id, status, subscription_id')
      .eq('reference', data.reference)
      .maybeSingle();

    if (!payment) {
      console.warn('No payment found for transfer reference:', data.reference);
      return;
    }

    if (payment.status === 'success') {
      console.log('Transfer already reconciled:', data.reference);
      return;
    }

    await admin.from('payments').update({ status: 'success' }).eq('id', payment.id);

    if (payment.subscription_id) {
      const { data: subscription } = await admin
        .from('subscriptions')
        .select('user_id')
        .eq('id', payment.subscription_id)
        .maybeSingle();

      if (subscription?.user_id) {
        await admin.from('notifications').insert({
          user_id: subscription.user_id,
          type: 'payment',
          title: 'Transfer Successful',
          message: `Your transfer with reference ${data.reference} was successful.`,
          read: false,
        });
      }
    }
  } catch (error) {
    console.error('Error processing transfer.success webhook:', error);
  }
}

async function handleTransferFailed(data: TransferFailedPayload) {
  console.log('Processing failed transfer:', data.reference);
  try {
    const admin = createAdminClient();

    // Check if we've already processed this failure
    const { data: payment } = await admin
      .from('payments')
      .select('id, status, subscription_id')
      .eq('reference', data.reference)
      .maybeSingle();

    if (!payment) {
      console.warn('No payment found for transfer reference:', data.reference);
      return;
    }

    if (payment.status === 'failed') {
      console.log('Transfer failure already recorded:', data.reference);
      return;
    }

    await admin.from('payments').update({ status: 'failed' }).eq('id', payment.id);

    if (payment.subscription_id) {
      const { data: subscription } = await admin
        .from('subscriptions')
        .select('user_id')
        .eq('id', payment.subscription_id)
        .maybeSingle();

      if (subscription?.user_id) {
        await admin.from('notifications').insert({
          user_id: subscription.user_id,
          type: 'payment',
          title: 'Transfer Failed',
          message: `Your transfer with reference ${data.reference} failed. Please contact support.`,
          read: false,
        });
      }
    }
  } catch (error) {
    console.error('Error processing transfer.failed webhook:', error);
  }
}
