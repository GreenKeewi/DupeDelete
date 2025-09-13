"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSession } from "@/components/SessionContextProvider";
import { useSubscription } from "@/hooks/use-subscription"; // Import useSubscription
import { Badge } from "@/components/ui/badge"; // Import Badge component

export const PricingSection = () => {
  const router = useRouter();
  const { user, isLoading: isSessionLoading } = useSession();
  const { plan: activePlan, isBasic, isPro, isLoading: isSubscriptionLoading } = useSubscription(); // Get active plan details
  const [loading, setLoading] = useState(false);
  const [isYearly, setIsYearly] = useState(false);

  const isLoading = isSessionLoading || isSubscriptionLoading;

  const handleCheckout = async (selectedPlan: "basic" | "pro") => {
    if (!user) {
      toast.info("Please log in to subscribe.", { id: "login-redirect" });
      router.push(`/login?redirect_to=${encodeURIComponent('/pricing')}`);
      return;
    }

    setLoading(true);
    const interval = isYearly ? "yearly" : "monthly";
    toast.loading(`Initiating ${selectedPlan} ${interval} plan checkout...`, { id: "checkout" });
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: selectedPlan, interval, userId: user.id }),
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

  const getButtonText = (planType: "basic" | "pro") => {
    if (isLoading) return "Loading...";
    if (loading) return "Processing...";
    
    const currentPlanIdentifier = `${planType}_${isYearly ? 'yearly' : 'monthly'}`;
    if (activePlan === currentPlanIdentifier) {
      return "Current Plan";
    }
    if (planType === "basic" && isBasic) {
      return "Current Plan";
    }
    if (planType === "pro" && isPro) {
      return "Current Plan";
    }
    return `Get ${planType === "basic" ? "Basic" : "Pro"} Plan (${isYearly ? "Yearly" : "Monthly"})`;
  };

  const isPlanActive = (planType: "basic" | "pro") => {
    if (planType === "basic") {
      return isBasic && (
        (isYearly && activePlan === 'basic_yearly') ||
        (!isYearly && activePlan === 'basic_monthly')
      );
    }
    if (planType === "pro") {
      return isPro && (
        (isYearly && activePlan === 'pro_yearly') ||
        (!isYearly && activePlan === 'pro_monthly')
      );
    }
    return false;
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
          disabled={isLoading}
        />
        <Label htmlFor="billing-toggle" className="text-lg">Yearly</Label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Basic Plan Card */}
        <Card className={`flex flex-col justify-between ${isPlanActive("basic") ? "border-primary shadow-lg" : ""}`}>
          <CardHeader>
            {isPlanActive("basic") && (
              <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">Current Plan</Badge>
            )}
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
              disabled={loading || isLoading || isPlanActive("basic")}
            >
              {getButtonText("basic")}
            </Button>
          </CardFooter>
        </Card>

        {/* Pro Plan Card */}
        <Card className={`flex flex-col justify-between ${isPlanActive("pro") ? "border-primary shadow-lg" : ""}`}>
          <CardHeader>
            {isPlanActive("pro") && (
              <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">Current Plan</Badge>
            )}
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
              disabled={loading || isLoading || isPlanActive("pro")}
            >
              {getButtonText("pro")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};