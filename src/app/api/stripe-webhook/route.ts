import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { buffer } from 'micro'; // Required to parse raw body

import { supabase } from '@/integrations/supabase/client'; // Import Supabase client

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

// Stripe requires the raw body to construct the event.
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: Request) {
  // Use req.text() for Next.js App Router to get the raw body
  const rawBody = await req.text();
  const buf = Buffer.from(rawBody); // Convert raw body string to Buffer
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) {
      throw new Error('Stripe signature or webhook secret missing.');
    }
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      const userId = checkoutSession.metadata?.userId;
      const planId = checkoutSession.metadata?.planId;
      const customerId = checkoutSession.customer as string;
      const subscriptionId = checkoutSession.subscription as string;

      if (!userId || !planId || !customerId || !subscriptionId) {
        console.error('Missing metadata or IDs in checkout.session.completed event:', checkoutSession);
        return new NextResponse('Missing required data', { status: 400 });
      }

      // Retrieve the subscription to get current_period_end
      const stripeSubscription: Stripe.Subscription = await stripe.subscriptions.retrieve(subscriptionId);

      // Update or create subscription in your database
      const { data, error } = await supabase
        .from('subscriptions')
        .upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: stripeSubscription.status,
            plan_id: planId,
            current_period_end: new Date((stripeSubscription as any).current_period_end * 1000).toISOString(),
          },
          { onConflict: 'stripe_subscription_id' } // Update if subscription_id already exists
        )
        .select()
        .single();

      if (error) {
        console.error('Supabase error updating subscription:', error);
        return new NextResponse('Supabase error', { status: 500 });
      }
      console.log('Subscription updated/created:', data);
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceSubscriptionId = (invoice as any).subscription as string; // invoice.subscription is a string ID

      if (!invoiceSubscriptionId) {
        console.error('Missing subscription ID in invoice.payment_succeeded event:', invoice);
        return new NextResponse('Missing required data', { status: 400 });
      }

      // Retrieve the subscription to get current_period_end and status
      const updatedStripeSubscription: Stripe.Subscription = await stripe.subscriptions.retrieve(invoiceSubscriptionId);

      // Update subscription status and period end in your database
      const { data: updatedData, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: updatedStripeSubscription.status,
          current_period_end: new Date((updatedStripeSubscription as any).current_period_end * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', invoiceSubscriptionId)
        .select()
        .single();

      if (updateError) {
        console.error('Supabase error updating subscription from invoice:', updateError);
        return new NextResponse('Supabase error', { status: 500 });
      }
      console.log('Subscription updated from invoice:', updatedData);
      break;

    case 'customer.subscription.deleted':
    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription; // This is already a Stripe.Subscription object
      // Update subscription status in your database
      const { data: subUpdateData, error: subUpdateError } = await supabase
        .from('subscriptions')
        .update({
          status: subscription.status,
          current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)
        .select()
        .single();

      if (subUpdateError) {
        console.error('Supabase error updating subscription status:', subUpdateError);
        return new NextResponse('Supabase error', { status: 500 });
      }
      console.log('Subscription status updated:', subUpdateData);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return new NextResponse('OK', { status: 200 });
}