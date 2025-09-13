"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSession } from "@/components/SessionContextProvider"; // Corrected import path

export const PricingSection = () => {
  const router = useRouter();
  const { user, isLoading } = useSession(); // Get user and loading state from session
  const [loading, setLoading] = useState(false);
  const [isYearly, setIsYearly] = useState(false);

  const handleCheckout = async (plan: "basic" | "pro") => {
    if (!user) {
      // If not logged in, redirect to login page with a return URL
      toast.info("Please log in to subscribe.", { id: "login-redirect" });
      router.push(`/login?redirect_to=${encodeURIComponent('/pricing')}`);
      return;
    }

    setLoading(true);
    const interval = isYearly ? "yearly" : "monthly";
    toast.loading(`Initiating ${plan} ${interval} plan checkout...`, { id: "checkout" });
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan, interval, userId: user.id }), // Pass userId to backend
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
    <div id="pricing-section" className="flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-center mb-4">Choose Your Plan</h1>
      <p className="text-lg text-muted-foreground text-center mb-8 max-w-2xl">
        Unlock unlimited cleaning and advanced features with our flexible plans.
      </p>

      {/* Monthly/Yearly Toggle */}
      <div className="flex items-center space-x-2 mb-12">
        <Label htmlFor="billing-toggle" className="text-lg">Monthly</Label>
        <Switch
          id="billing-toggle"
          checked={isYearly}
          onCheckedChange={setIsYearly}
          className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground"
        />
        <Label htmlFor="billing-toggle" className="text-lg">Yearly</Label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Basic Plan Card */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-3xl">Basic Plan</CardTitle>
            <CardDescription className="text-lg mt-2">
              {isYearly ? "$100/year" : "$10/month"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">Perfect for occasional cleaning.</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Clean up to 1,000 images</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Standard duplicate image detection</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Email support</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => handleCheckout("basic")}
              disabled={loading || isLoading} // Disable if loading session or checkout
            >
              {isLoading ? "Loading..." : (loading ? "Processing..." : `Get Basic Plan (${isYearly ? "Yearly" : "Monthly"})`)}
            </Button>
          </CardFooter>
        </Card>

        {/* Pro Plan Card */}
        <Card className="flex flex-col justify-between border-primary shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl">Pro Plan</CardTitle>
            <CardDescription className="text-lg mt-2">
              {isYearly ? "$160/year" : "$16/month"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">For power users with large collections.</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Unlimited image cleaning</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Advanced duplicate image detection</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Priority support</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Future premium features</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => handleCheckout("pro")}
              disabled={loading || isLoading} // Disable if loading session or checkout
            >
              {isLoading ? "Loading..." : (loading ? "Processing..." : `Get Pro Plan (${isYearly ? "Yearly" : "Monthly"})`)}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};