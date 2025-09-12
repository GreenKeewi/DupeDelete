"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (plan: "basic" | "pro") => {
    setLoading(true);
    toast.loading(`Initiating ${plan} plan checkout...`, { id: "checkout" });
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session.");
      }

      const { url } = await response.json();
      if (url) {
        router.push(url);
      } else {
        throw new Error("No checkout URL received.");
      }
    } catch (error) {
      console.error("Stripe checkout error:", error);
      toast.error("Failed to start checkout. Please try again.", { id: "checkout" });
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto p-4 md:p-10 min-h-[calc(100vh-128px)] flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-center mb-8">Choose Your Plan</h1>
      <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl">
        Unlock unlimited cleaning and advanced features with our flexible plans.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Basic Plan Card */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-3xl">Basic Plan</CardTitle>
            <CardDescription className="text-lg mt-2">$10/month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">Perfect for occasional cleaning.</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Clean up to 1,000 files</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Standard duplicate detection</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Email support</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => handleCheckout("basic")}
              disabled={loading}
            >
              {loading ? "Processing..." : "Get Basic Plan"}
            </Button>
          </CardFooter>
        </Card>

        {/* Pro Plan Card */}
        <Card className="flex flex-col justify-between border-primary shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl">Pro Plan</CardTitle>
            <CardDescription className="text-lg mt-2">$16/month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">For power users with large collections.</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Unlimited file cleaning</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Advanced duplicate detection</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Priority support</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Future premium features</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => handleCheckout("pro")}
              disabled={loading}
            >
              {loading ? "Processing..." : "Get Pro Plan"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}