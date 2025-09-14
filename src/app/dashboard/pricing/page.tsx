"use client";

import { PricingSection } from "@/components/PricingSection";
import { useSession } from "@/components/SessionContextProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useCheckout } from "@/hooks/use-checkout"; // Import the new hook
import { toast } from "sonner";

export default function DashboardPricingPage() {
  const { user, isLoading: isSessionLoading } = useSession();
  const router = useRouter();
  const [isPageLoading, setIsPageLoading] = useState(true);
  const { initiateCheckout, isCheckoutLoading } = useCheckout({ user });

  useEffect(() => {
    if (!isSessionLoading && !user) {
      router.push("/login?redirect_to=/dashboard/pricing");
    } else if (!isSessionLoading && user) {
      setIsPageLoading(false); // User is logged in, stop page loading
    }
  }, [user, isSessionLoading, router]);

  // Effect to handle pending checkout after login
  useEffect(() => {
    if (user && !isSessionLoading && !isCheckoutLoading) {
      const pendingPlan = localStorage.getItem('pendingCheckoutPlan');
      const pendingInterval = localStorage.getItem('pendingCheckoutInterval');

      if (pendingPlan && pendingInterval) {
        // Clear local storage immediately to prevent re-triggering
        localStorage.removeItem('pendingCheckoutPlan');
        localStorage.removeItem('pendingCheckoutInterval');

        // Ensure plan and interval are valid types
        const planType = pendingPlan === 'basic' || pendingPlan === 'pro' ? pendingPlan : null;
        const intervalType = pendingInterval === 'monthly' || pendingInterval === 'yearly' ? pendingInterval : null;

        if (planType && intervalType) {
          toast.info("Resuming your subscription process...", { id: "resume-checkout" });
          initiateCheckout(planType, intervalType);
        } else {
          console.error("Invalid pending plan or interval found in local storage.");
          toast.error("Could not resume subscription. Please try again.", { id: "resume-checkout" });
        }
      }
    }
  }, [user, isSessionLoading, isCheckoutLoading, initiateCheckout]);

  if (isPageLoading || isSessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-128px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading user session...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="w-full">
      <PricingSection />
    </div>
  );
}