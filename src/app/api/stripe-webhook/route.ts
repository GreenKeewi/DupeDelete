import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabase } from "@/integrations/supabase/client";

// Stripe needs the raw body for signature verification, so we disable Next.js's body parser.
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to convert ReadableStream to Buffer
async function getRawBody(readable: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Changed API version to match the expected type "2025-08-27.basil"
  apiVersion: "2025-08-27.basil", 
});

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set.");
    return new NextResponse("Stripe webhook secret not configured.", { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new NextResponse("No Stripe signature header.", { status: 400 });
  }

  let event: Stripe.Event;
  let rawBody: Buffer;

  try {
    // Get the raw body from the request stream
    rawBody = await getRawBody(req.body as ReadableStream<Uint8Array>);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("Stripe Checkout Session Completed:", session.id);

      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const userId = session.metadata?.user_id; // Retrieve user_id from metadata

      if (!userId) {
        console.error("User ID not found in checkout session metadata.");
        return new NextResponse("User ID missing in metadata.", { status: 400 });
      }

      // Fetch subscription details from Stripe
      const stripeSubscription: Stripe.Subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = stripeSubscription.items.data[0].price.id;
      // Asserting type for current_period_end to resolve TypeScript error
      const currentPeriodEnd = new Date(((stripeSubscription as any).current_period_end as number) * 1000).toISOString();

      // Determine plan_id based on Stripe Price ID
      let plan_id: string;
      if (priceId === process.env.STRIPE_BASIC_PRICE_ID) {
        plan_id = 'basic_monthly';
      } else if (priceId === process.env.STRIPE_BASIC_YEARLY_PRICE_ID) {
        plan_id = 'basic_yearly';
      } else if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
        plan_id = 'pro_monthly';
      } else if (priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID) {
        plan_id = 'pro_yearly';
      } else {
        console.warn(`Unknown Stripe Price ID: ${priceId}. Defaulting to 'free'.`);
        plan_id = 'free';
      }

      // Upsert (insert or update) the subscription in Supabase
      const { error: upsertError } = await supabase
        .from('subscriptions')
        .upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: stripeSubscription.status,
            plan_id: plan_id,
            current_period_end: currentPeriodEnd,
          },
          { onConflict: 'user_id' } // Conflict on user_id to update existing subscription
        );

      if (upsertError) {
        console.error("Error upserting subscription:", upsertError);
        return new NextResponse(`Database Error: ${upsertError.message}`, { status: 500 });
      }
      console.log(`Subscription for user ${userId} updated to ${plan_id} (${stripeSubscription.status}).`);
      break;
    // Add other event types as needed (e.g., 'customer.subscription.updated', 'invoice.payment_failed')
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return new NextResponse("OK", { status: 200 });
}