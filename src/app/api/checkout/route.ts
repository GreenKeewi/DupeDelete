import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil", // Updated API version to resolve TypeScript error
});

export async function POST(req: Request) {
  if (req.method !== "POST") {
    return new NextResponse("Method Not Allowed", { status: 405 });
  }

  try {
    const { plan } = await req.json();

    if (!plan || (plan !== "basic" && plan !== "pro")) {
      return new NextResponse("Invalid plan specified", { status: 400 });
    }

    const priceId = plan === "basic"
      ? process.env.STRIPE_BASIC_PRICE_ID
      : process.env.STRIPE_PRO_PRICE_ID;

    if (!priceId) {
      console.error(`Stripe price ID not configured for plan: ${plan}`);
      return new NextResponse(`Stripe price ID not configured for ${plan} plan.`, { status: 500 });
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
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}