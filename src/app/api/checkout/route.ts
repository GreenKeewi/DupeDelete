import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) {
  if (req.method !== "POST") {
    return new NextResponse(JSON.stringify({ message: "Method Not Allowed" }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { plan, interval } = await req.json(); // Get interval from request body

    if (!plan || (plan !== "basic" && plan !== "pro")) {
      return new NextResponse(JSON.stringify({ message: "Invalid plan specified" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!interval || (interval !== "monthly" && interval !== "yearly")) {
      return new NextResponse(JSON.stringify({ message: "Invalid interval specified" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    let priceId: string | undefined;

    if (plan === "basic") {
      priceId = interval === "monthly"
        ? process.env.STRIPE_BASIC_PRICE_ID
        : process.env.STRIPE_BASIC_YEARLY_PRICE_ID; // Use new yearly price ID
    } else if (plan === "pro") {
      priceId = interval === "monthly"
        ? process.env.STRIPE_PRO_PRICE_ID
        : process.env.STRIPE_PRO_YEARLY_PRICE_ID; // Use new yearly price ID
    }

    if (!priceId) {
      console.error(`Stripe price ID not configured for plan: ${plan} and interval: ${interval}`);
      return new NextResponse(JSON.stringify({ message: `Stripe price ID not configured for ${plan} ${interval} plan.` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session creation failed:", error);
    return new NextResponse(JSON.stringify({ message: "Internal Server Error", error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}