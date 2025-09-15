"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";

interface UseCheckoutOptions {
  user: User | null;
  onLoadingChange?: (loading: boolean) => void;
}

export const useCheckout = ({ user, onLoadingChange }: UseCheckoutOptions) => {
  const router = useRouter();
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const initiateCheckout = async (plan: "basic" | "pro", interval: "monthly" | "yearly") => {
    if (!user) {
      toast.info("Please log in to subscribe.", { id: "login-redirect" });
      // Store the intended plan in local storage before redirecting
      localStorage.setItem('pendingCheckoutPlan', plan);
      localStorage.setItem('pendingCheckoutInterval', interval);
      router.push(`/login?redirect_to=${encodeURIComponent('/dashboard/pricing')}`);
      return;
    }

    setIsCheckoutLoading(true);
    onLoadingChange?.(true);
    toast.loading(`Initiating ${plan} ${interval} plan checkout...`, { id: "checkout" });

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan, interval, userId: user.id }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to create checkout session.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          // If response is not JSON, use a generic message
          console.error("Failed to parse error response from /api/checkout:", parseError);
        }
        throw new Error(errorMessage);
      }

      const { url } = await response.json();
      if (url) {
        router.push(url);
      } else {
        throw new Error("No checkout URL received.");
      }
    } catch (error: any) {
      console.error("Stripe checkout error:", error);
      toast.error(error.message || "Failed to start checkout. Please try again.", { id: "checkout" });
      setIsCheckoutLoading(false);
      onLoadingChange?.(false);
    }
  };

  return { initiateCheckout, isCheckoutLoading };
};