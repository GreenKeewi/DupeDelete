import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) {
  if (req.method !== "POST") {
    return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
  }

  try {
    const { plan, interval, userId } = await req.json(); // Get interval and userId from request body

    if (!plan || (plan !== "basic" && plan !== "pro")) {
      return NextResponse.json({ message: "Invalid plan specified" }, { status: 400 });
    }
    if (!interval || (interval !== "monthly" && interval !== "yearly")) {
      return NextResponse.json({ message: "Invalid interval specified" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ message: "User ID is required for checkout." }, { status: 400 });
    }

    let priceId: string | undefined;

    if (plan === "basic") {
      priceId = interval === "monthly"
        ? process.env.STRIPE_BASIC_PRICE_ID
        : process.env.STRIPE_BASIC_YEARLY_PRICE_ID;
    } else if (plan === "pro") {
      priceId = interval === "monthly"
        ? process.env.STRIPE_PRO_PRICE_ID
        : process.env.STRIPE_PRO_YEARLY_PRICE_ID;
    }

    if (!priceId) {
      console.error(`Stripe price ID not configured for plan: ${plan} and interval: ${interval}`);
      return NextResponse.json({ message: `Stripe price ID not configured for ${plan} ${interval} plan.` }, { status: 500 });
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
      metadata: {
        user_id: userId, // Pass the user ID to the Stripe session metadata
      },
      client_reference_id: userId, // Also useful for linking
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session creation failed:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}