import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil", // Updated API version to match type definitions
});

export async function POST(req: Request) {
  if (req.method !== "POST") {
    return new NextResponse("Method Not Allowed", { status: 405 });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new NextResponse(JSON.stringify({ message: "User ID is required." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Initialize Supabase client with the Service Role Key for server-side operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch the user's subscription from Supabase
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error("Error fetching subscription for cancellation:", fetchError);
      return new NextResponse(JSON.stringify({ message: "Failed to find active subscription." }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    if (!subscription || !subscription.stripe_subscription_id) {
      return new NextResponse(JSON.stringify({ message: "No active Stripe subscription found for this user." }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // Cancel the subscription in Stripe
    const cancelledSubscription: Stripe.Subscription = await stripe.subscriptions.cancel(
      subscription.stripe_subscription_id
    );

    let currentPeriodEnd: string | null = null;
    // Use type assertion to bypass TypeScript's strict check for current_period_end
    if (typeof (cancelledSubscription as any).current_period_end === 'number') {
      currentPeriodEnd = new Date((cancelledSubscription as any).current_period_end * 1000).toISOString();
    }

    // Update the subscription status in Supabase
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: cancelledSubscription.status, // Should be 'canceled'
        current_period_end: currentPeriodEnd, // Safely update period end
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error("Error updating subscription status in Supabase:", updateError);
      return new NextResponse(JSON.stringify({ message: "Failed to update subscription status in database." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return NextResponse.json({ message: "Subscription cancelled successfully." });
  } catch (error: any) {
    console.error("Error in /api/cancel-subscription:", error);
    return new NextResponse(JSON.stringify({ message: error.message || "Internal Server Error" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}