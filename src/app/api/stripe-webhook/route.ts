import { NextResponse } from 'next/server';
import StripeSDK from 'stripe'; // Aliasing Stripe to StripeSDK
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client

const stripe = new StripeSDK(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parser for webhooks
  },
};

export async function POST(req: Request) {
  // Read the raw request body as an ArrayBuffer
  const rawBody = await req.arrayBuffer();
  const buf = Buffer.from(rawBody); // Convert ArrayBuffer to Node.js Buffer

  const sig = req.headers.get('stripe-signature');

  let event: StripeSDK.Event; // Use StripeSDK.Event

  try {
    event = stripe.webhooks.constructEvent(buf, sig!, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`Received Stripe event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const checkoutSession = event.data.object as StripeSDK.Checkout.Session; // Use StripeSDK.Checkout.Session
        const userId = checkoutSession.client_reference_id;
        const customerId = checkoutSession.customer as string;
        const subscriptionId = checkoutSession.subscription as string;
        const planId = checkoutSession.metadata?.plan_id || 'unknown';

        if (!userId || !customerId || !subscriptionId) {
          console.error('Missing required data in checkout.session.completed event:', { userId, customerId, subscriptionId });
          return new NextResponse('Missing data', { status: 400 });
        }

        // Retrieve the subscription to get current_period_end
        const stripeSubscription: StripeSDK.Subscription = await stripe.subscriptions.retrieve(subscriptionId); // Use StripeSDK.Subscription

        const { data, error } = await supabase
          .from('subscriptions')
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              status: stripeSubscription.status,
              plan_id: planId,
              current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            },
            { onConflict: 'user_id', ignoreDuplicates: false } // Update if user_id exists
          );

        if (error) {
          console.error('Error upserting subscription:', error);
          return new NextResponse(`Database Error: ${error.message}`, { status: 500 });
        }
        console.log('Subscription created/updated:', data);
        break;

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription: StripeSDK.Subscription = event.data.object as StripeSDK.Subscription; // Use StripeSDK.Subscription
        let updatedUserId = subscription.metadata.supabase_user_id; // Changed to 'let'

        if (!updatedUserId) {
          console.warn('Subscription updated/deleted event missing supabase_user_id in metadata:', subscription);
          // Attempt to find by stripe_subscription_id if userId is missing
          const { data: existingSub, error: findError } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscription.id)
            .single();

          if (findError || !existingSub) {
            console.error('Could not find user for subscription update/delete:', subscription.id, findError);
            return new NextResponse('User not found for subscription update', { status: 400 });
          }
          // If found, use that user ID
          updatedUserId = existingSub.user_id;
        }

        const { data: updateData, error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            // Optionally update plan_id if it can change during updates
          })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          console.error('Error updating subscription status:', updateError);
          return new NextResponse(`Database Error: ${updateError.message}`, { status: 500 });
        }
        console.log('Subscription status updated:', updateData);
        break;

      default:
        console.warn(`Unhandled event type ${event.type}`);
    }
  } catch (error: any) {
    console.error('Error processing Stripe webhook event:', error);
    return new NextResponse(`Webhook handler failed: ${error.message}`, { status: 500 });
  }

  return new NextResponse(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}