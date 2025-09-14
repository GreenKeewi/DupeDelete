import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js'; // Import createClient for server-side

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
  apiVersion: "2025-08-27.basil", 
});

export async function POST(req: Request) {
  console.log("[Stripe Webhook] Received a request.");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set.");
    return new NextResponse("Stripe webhook secret not configured.", { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    console.error("[Stripe Webhook] No Stripe signature header.");
    return new NextResponse("No Stripe signature header.", { status: 400 });
  }

  let event: Stripe.Event;
  let rawBody: Buffer;

  try {
    rawBody = await getRawBody(req.body as ReadableStream<Uint8Array>);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    console.log(`[Stripe Webhook] Event constructed: ${event.type}`);
  } catch (err: any) {
    console.error(`[Stripe Webhook] Webhook signature verification failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Initialize Supabase client with the Service Role Key for server-side operations
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("[Stripe Webhook] Checkout Session Completed:", session.id);

      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const userId = session.metadata?.user_id;

      if (!userId) {
        console.error("[Stripe Webhook] User ID not found in checkout session metadata for session:", session.id);
        return new NextResponse("User ID missing in metadata.", { status: 400 });
      }

      try {
        const stripeSubscription: any = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = stripeSubscription.items.data[0].price.id;
        
        let currentPeriodEnd: string | null = null;
        // Safely check if current_period_end is a valid number before converting
        if (typeof stripeSubscription.current_period_end === 'number') {
          currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString();
        } else {
          console.warn(`[Stripe Webhook] current_period_end is not a valid number for subscription ${subscriptionId}. Value: ${stripeSubscription.current_period_end}`);
        }

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
          console.warn(`[Stripe Webhook] Unknown Stripe Price ID: ${priceId}. Defaulting to 'free'.`);
          plan_id = 'free';
        }

        const subscriptionData = {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: stripeSubscription.status,
          plan_id: plan_id,
          current_period_end: currentPeriodEnd,
        };

        console.log("[Stripe Webhook] Attempting to upsert subscription data:", subscriptionData);

        const { error: upsertError } = await supabaseAdmin
          .from('subscriptions')
          .upsert(subscriptionData, { onConflict: 'user_id' });

        if (upsertError) {
          console.error("[Stripe Webhook] Error upserting subscription:", JSON.stringify(upsertError, null, 2));
          return new NextResponse(`Database Error: ${upsertError.message}`, { status: 500 });
        }
        console.log(`[Stripe Webhook] Subscription for user ${userId} successfully updated to ${plan_id} (${stripeSubscription.status}).`);
      } catch (retrieveError: any) {
        console.error("[Stripe Webhook] Error retrieving Stripe subscription details or processing data:", retrieveError);
        return new NextResponse(`Stripe API Error: ${retrieveError.message}`, { status: 500 });
      }
      break;
    default:
      console.log(`[Stripe Webhook] Unhandled event type ${event.type}`);
  }

  return new NextResponse("OK", { status: 200 });
}