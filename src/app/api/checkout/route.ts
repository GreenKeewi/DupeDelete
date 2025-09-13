import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) {
  if (req.method !== "POST") {
    return new NextResponse("Method Not Allowed", { status: 405 });
  }

  try {
    const { plan, interval, userId } = await req.json(); // Get userId from request body

    if (!userId) {
      return new NextResponse("User ID is required for checkout.", { status: 400 });
    }
    if (!plan || (plan !== "basic" && plan !== "pro")) {
      return new NextResponse("Invalid plan specified", { status: 400 });
    }
    if (!interval || (interval !== "monthly" && interval !== "yearly")) {
      return new NextResponse("Invalid interval specified", { status: 400 });
    }

    let priceId: string | undefined;
    let planIdentifier: string; // To store in our DB

    if (plan === "basic") {
      priceId = interval === "monthly"
        ? process.env.STRIPE_BASIC_PRICE_ID
        : process.env.STRIPE_BASIC_YEARLY_PRICE_ID;
      planIdentifier = `basic_${interval}`;
    } else if (plan === "pro") {
      priceId = interval === "monthly"
        ? process.env.STRIPE_PRO_PRICE_ID
        : process.env.STRIPE_PRO_YEARLY_PRICE_ID;
      planIdentifier = `pro_${interval}`;
    } else {
      return new NextResponse("Invalid plan specified", { status: 400 });
    }

    if (!priceId) {
      console.error(`Stripe price ID not configured for plan: ${plan} and interval: ${interval}`);
      return new NextResponse(`Stripe price ID not configured for ${plan} ${interval} plan.`, { status: 500 });
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
      metadata: {
        userId: userId,
        planId: planIdentifier,
      },
    });

    // Optionally, create a pending subscription entry in your DB
    // This entry will be updated by the webhook upon successful payment
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_id: planIdentifier,
        status: 'pending', // Initial status
        stripe_customer_id: null, // Will be filled by webhook
        stripe_subscription_id: null, // Will be filled by webhook
        current_period_end: null, // Will be filled by webhook
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating pending subscription entry:", error);
      // You might want to handle this error more gracefully, e.g., by logging and still returning the Stripe URL
      // as the Stripe session is already created. The webhook will be the source of truth.
    } else {
      console.log("Pending subscription entry created:", data);
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session creation failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}