import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabase, createServerSupabaseClient } from "@/integrations/supabase/client"; // Import both clients

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) {
  if (req.method !== "POST") {
    return new NextResponse(JSON.stringify({ message: "Method Not Allowed" }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { plan, interval, userId } = await req.json(); // Get interval and userId from request body

    if (!userId) {
      return new NextResponse(JSON.stringify({ message: "User ID is required for checkout." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!plan || (plan !== "basic" && plan !== "pro")) {
      return new NextResponse(JSON.stringify({ message: "Invalid plan specified" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!interval || (interval !== "monthly" && interval !== "yearly")) {
      return new NextResponse(JSON.stringify({ message: "Invalid interval specified" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    let priceId: string | undefined;
    let planIdForDb: string;

    if (plan === "basic") {
      priceId = interval === "monthly"
        ? process.env.STRIPE_BASIC_PRICE_ID
        : process.env.STRIPE_BASIC_YEARLY_PRICE_ID;
      planIdForDb = `basic_${interval}`;
    } else if (plan === "pro") {
      priceId = interval === "monthly"
        ? process.env.STRIPE_PRO_PRICE_ID
        : process.env.STRIPE_PRO_YEARLY_PRICE_ID;
      planIdForDb = `pro_${interval}`;
    } else {
      return new NextResponse(JSON.stringify({ message: "Invalid plan specified" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!priceId) {
      console.error(`Stripe price ID not configured for plan: ${plan} and interval: ${interval}`);
      return new NextResponse(JSON.stringify({ message: `Stripe price ID not configured for ${plan} ${interval} plan.` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Initialize server-side Supabase client
    const serverSupabase = createServerSupabaseClient();

    // Get user's email from Supabase for Stripe customer creation using the server-side client
    const { data: { user }, error: userError } = await serverSupabase.auth.admin.getUserById(userId);

    if (userError || !user) {
      console.error("Error fetching user for Stripe checkout:", userError?.message);
      return new NextResponse(JSON.stringify({ message: "User not found or unauthorized." }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Create or retrieve Stripe customer
    let customerId: string | undefined;

    // Check if user already has a stripe_customer_id in their profile or subscriptions
    const { data: existingSubscription, error: subError } = await serverSupabase // Use serverSupabase here too
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (subError && subError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error("Error checking existing subscription for customer ID:", subError);
      return new NextResponse(JSON.stringify({ message: "Internal Server Error during customer lookup." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    if (existingSubscription?.stripe_customer_id) {
      customerId = existingSubscription.stripe_customer_id;
    } else {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: userId,
        },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customerId, // Link to the Stripe customer
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`, // Pass session ID
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
      metadata: {
        supabase_user_id: userId,
        plan_id: planIdForDb,
      },
      client_reference_id: userId, // Link to Supabase user ID
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session creation failed:", error);
    return new NextResponse(JSON.stringify({ message: "Internal Server Error", error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}